from scipy.spatial import distance as dist
from imutils.video import VideoStream
from imutils import face_utils
from threading import Thread, Lock  
import numpy as np
import pyglet
import argparse
import imutils
import time
import dlib
import cv2
import sys 
import os
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity

# --- GLOBAL STATE AND LOCKS ---
ALARM_LOCK = Lock()
PAUSED = False
ALARM_ON = False
AUTHENTICATED = False 
AUTHENTICATION_TIMEOUT_FRAMES = 150 
AUTHENTICATION_FRAME_COUNT = 0
CURRENT_DRIVER_NAME = "Unauthenticated"

# --- CONSTANTS ---
EYE_AR_THRESH = 0.26
EYE_AR_CONSEC_FRAMES = 30
PULLED_OVER_FRAMES = 170 
FACE_LOST_ALARM_FRAMES = 60 
FACE_NOT_DETECTED_CRITICAL_PULLOVER = 200

COUNTER = 0
FINAL_COUNTER = 0 
FACE_NOT_DETECTED_COUNTER = 0

# --- ARC FACE & DB SETUP ---
print("🔄 Loading ArcFace model (InsightFace for Authentication)...")
# Optimized for Pi 5 CPU
FA_APP = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
FA_APP.prepare(ctx_id=0)
print("✅ ArcFace ready!")

FACE_DB = {}
AUTH_THRESHOLD = 0.50 

def load_known_faces():
    global FACE_DB
    FACE_DB = {}
    # Using absolute path for Raspberry Pi
    known_faces_path = "/home/nisha/Documents/Drowsiness+Arcface/known_faces"
    os.makedirs(known_faces_path, exist_ok=True)
    
    for file in os.listdir(known_faces_path):
        if file.endswith((".jpg", ".png")):
            name = os.path.splitext(file)[0]
            img = cv2.imread(os.path.join(known_faces_path, file))
            if img is None:
                print(f"[ERROR] Could not read image file: {file}")
                continue
                
            faces = FA_APP.get(img)
            if faces:
                FACE_DB[name] = faces[0].normed_embedding
    print(f"📁 Loaded {len(FACE_DB)} known face(s) for authentication.")

load_known_faces()

def sound_alarm(path):
    try:
        # Absolute path for Pi 5 audio
        alarm_path = "/home/nisha/Documents/Drowsiness+Arcface/alarm.wav"
        music = pyglet.media.load(alarm_path)
        music.play()
    except Exception as e:
        print(f"[AUDIO ERROR] {e}")

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

# --- INITIALIZATION ---
print("[INFO] loading facial landmark predictor (Dlib)...")
# Absolute path to your .dat file
predictor_path = "/home/nisha/Documents/Drowsiness+Arcface/68 face landmarks.dat"
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(predictor_path)

clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
(lStart, lEnd) = face_utils.FACIAL_LANDMARKS_IDXS["left_eye"]
(rStart, rEnd) = face_utils.FACIAL_LANDMARKS_IDXS["right_eye"]

print("[INFO] starting video stream thread...")
# src=0 for your Microdia USB Camera
vs = VideoStream(src=0).start()
time.sleep(2.0)

# --- MAIN LOOP ---
while True:
    frame = vs.read()
    if frame is None: break

    # Performance Tweak: 320px width keeps FPS high on Pi 5
    frame = imutils.resize(frame, width=320)
    frame_display = frame.copy() 

    if not AUTHENTICATED:
        cv2.putText(frame_display, "SYSTEM LOCKED", (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        # Authentication using RGB for ArcFace accuracy
        faces_fa = FA_APP.get(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        for face in faces_fa:
            emb = face.normed_embedding
            max_sim = 0.0
            auth_name = None
            
            for db_name, db_emb in FACE_DB.items():
                sim = cosine_similarity([emb], [db_emb])[0][0]
                if sim > AUTH_THRESHOLD and sim > max_sim:
                    max_sim = sim
                    auth_name = db_name
            
            if auth_name:
                CURRENT_DRIVER_NAME = auth_name 
                AUTHENTICATED = True
                print(f"[AUTH] Driver '{auth_name}' verified.")
                break

    if AUTHENTICATED:
        if PAUSED:
            frame_paused = np.zeros((320, 320, 3), dtype="uint8")
            cv2.putText(frame_paused, "CAR STOPPED", (10, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.imshow("Frame", frame_paused)
            if cv2.waitKey(0) & 0xFF == ord("r"):
                PAUSED = False; COUNTER = 0; FINAL_COUNTER = 0; AUTHENTICATED = False
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        enhanced_gray = clahe.apply(gray)
        rects = detector(enhanced_gray, 0)

        if len(rects) == 0:
            FACE_NOT_DETECTED_COUNTER += 1
            if FACE_NOT_DETECTED_COUNTER >= FACE_LOST_ALARM_FRAMES:
                cv2.putText(frame_display, "FACE LOST!", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            if FACE_NOT_DETECTED_COUNTER >= FACE_NOT_DETECTED_CRITICAL_PULLOVER:
                PAUSED = True
        else:
            FACE_NOT_DETECTED_COUNTER = 0
            for rect in rects:
                shape = predictor(gray, rect)
                shape = face_utils.shape_to_np(shape)
                leftEye = shape[lStart:lEnd]; rightEye = shape[rStart:rEnd]
                ear = (eye_aspect_ratio(leftEye) + eye_aspect_ratio(rightEye)) / 2.0

                if ear < EYE_AR_THRESH:
                    COUNTER += 1; FINAL_COUNTER += 1 
                    if COUNTER >= EYE_AR_CONSEC_FRAMES:
                        cv2.putText(frame_display, "DROWSY!", (10, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                        with ALARM_LOCK:
                            if not ALARM_ON:
                                ALARM_ON = True
                                Thread(target=sound_alarm, args=("alarm.wav",)).start()
                else:
                    COUNTER = 0; FINAL_COUNTER = 0; ALARM_ON = False

                cv2.putText(frame_display, f"Driver: {CURRENT_DRIVER_NAME}", (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

    cv2.imshow("Frame", frame_display)
    if cv2.waitKey(1) & 0xFF == ord("q"): break

print("[INFO] cleaning up...")
cv2.destroyAllWindows()
vs.stop()
