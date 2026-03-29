import serial
import time
import json
import pynmea2
import paho.mqtt.client as mqtt
from scipy.spatial import distance as dist
from imutils.video import VideoStream
from imutils import face_utils
from threading import Thread, Lock
import numpy as np
import imutils
import dlib
import cv2
import os
import sys
from ultralytics import YOLO 
import RPi.GPIO as GPIO
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity

# --- FORCE CPU OPTIMIZATION ---
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["ORT_DISABLE_OPEN_VINO"] = "1"

# ==========================================
# 0. HARDWARE & CONFIG
# ==========================================
BUZZER_PIN = 23
MQTT_BROKER = "100.92.235.83"
MQTT_PORT = 1884
DEVICE_ID = "ev_car_01"
TOPIC_ALERTS = "taxi/app/driver/requests"
TOPIC_LOCATION = "fleet/ev/location"

# --- GLOBAL STATE ---
AUTHENTICATED = False
CURRENT_DRIVER_NAME = "Unauthenticated"
PAUSED = False
ALARM_ON = False
FRAME_LOCK = Lock()
PROCESSING_FACE = False  # Flag to prevent multiple auth threads

# ==========================================
# 1. AI MODEL INITIALIZATION (LATENCY FOCUS)
# ==========================================
print("🔄 Loading AI Models...")

# InsightFace: Use 'small' model providers if possible
FA_APP = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
FA_APP.prepare(ctx_id=0, det_size=(320, 320)) # Fixed smaller detection size for speed

# Load Dlib (Keep this for EAR)
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("68 face landmarks.dat")

# YOLOv8
yolo_model = YOLO("best.onnx", task="detect") if os.path.exists("best.onnx") else None

FACE_DB = {}
def load_known_faces():
    known_faces_path = "known_faces"
    if not os.path.exists(known_faces_path): os.makedirs(known_faces_path)
    for file in os.listdir(known_faces_path):
        if file.endswith((".jpg", ".png")):
            name = os.path.splitext(file)[0]
            img = cv2.imread(os.path.join(known_faces_path, file))
            if img is not None:
                faces = FA_APP.get(img)
                if faces: FACE_DB[name] = faces[0].normed_embedding
load_known_faces()

# ==========================================
# 2. OPTIMIZED BACKGROUND AUTHENTICATION
# ==========================================
def async_face_auth(frame_rgb):
    """ Runs Face Recognition in background to avoid UI freezing """
    global AUTHENTICATED, CURRENT_DRIVER_NAME, PROCESSING_FACE
    PROCESSING_FACE = True
    faces = FA_APP.get(frame_rgb)
    
    for face in faces:
        emb = face.normed_embedding
        for db_name, db_emb in FACE_DB.items():
            sim = cosine_similarity([emb], [db_emb])[0][0]
            if sim > 0.50: # Auth Threshold
                CURRENT_DRIVER_NAME = db_name
                AUTHENTICATED = True
                send_to_dashboard("AUTH SUCCESS", f"Welcome, {db_name}!", "success")
                sound_buzzer("unlock")
                break
    PROCESSING_FACE = False

# ==========================================
# 3. MAIN LOGIC
# ==========================================
vs = VideoStream(src=0).start()
time.sleep(2.0)

FRAME_COUNTER = 0
LAST_YOLO_RESULTS = None
AUTH_COOLDOWN = time.time()

while True:
    frame = vs.read()
    if frame is None: break
    
    # Process smaller frame for AI, show larger frame for UI
    frame_ai = imutils.resize(frame, width=320)
    frame_display = imutils.resize(frame, width=450)
    FRAME_COUNTER += 1

    # PHASE 1: ASYNC AUTHENTICATION (Every 2 seconds)
    if not AUTHENTICATED:
        cv2.putText(frame_display, "LOCKED: SCANNING...", (10, 30), 1, 1.5, (0, 0, 255), 2)
        if not PROCESSING_FACE and (time.time() - AUTH_COOLDOWN > 2.0):
            AUTH_COOLDOWN = time.time()
            rgb_auth = cv2.cvtColor(frame_ai, cv2.COLOR_BGR2RGB)
            Thread(target=async_face_auth, args=(rgb_auth,), daemon=True).start()

    # PHASE 2: ACTIVE MONITORING (Only after Auth)
    else:
        # --- YOLO (Every 6 frames to save CPU) ---
        if yolo_model and FRAME_COUNTER % 6 == 0:
            LAST_YOLO_RESULTS = yolo_model.predict(source=frame_ai, conf=0.50, verbose=False)
        
        if LAST_YOLO_RESULTS:
            # logic for alerts here (phone, seatbelt)...
            pass

        # --- DLIB (Every 3 frames) ---
        if FRAME_COUNTER % 3 == 0:
            gray = cv2.cvtColor(frame_ai, cv2.COLOR_BGR2GRAY)
            # Find face using fast detector
            rects = detector(gray, 0)
            for rect in rects:
                # Scaled rect to match AI frame
                shape = predictor(gray, rect)
                # ... EAR Logic ...

    cv2.imshow("Driver Management System", frame_display)
    if cv2.waitKey(1) & 0xFF == ord("q"): break

# Cleanup...
