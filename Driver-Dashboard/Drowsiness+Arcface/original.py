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
print("🔄 Step 1: Loading ArcFace (Identity Verification)...")
# On Pi 4B, 'CPUExecutionProvider' is the only option without an external GPU
FA_APP = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
FA_APP.prepare(ctx_id=0)

FACE_DB = {}
AUTH_THRESHOLD = 0.50 

def load_known_faces():
    global FACE_DB
    known_faces_path = "known_faces"
    if not os.path.exists(known_faces_path):
        os.makedirs(known_faces_path)
        print(f"⚠️ Created '{known_faces_path}' folder. Please put a .jpg photo of yourself there!")
    
    for file in os.listdir(known_faces_path):
        if file.endswith((".jpg", ".png")):
            name = os.path.splitext(file)[0]
            img = cv2.imread(os.path.join(known_faces_path, file))
            if img is not None:
                faces = FA_APP.get(img)
                if faces:
                    FACE_DB[name] = faces[0].normed_embedding
    print(f"📁 Database: {len(FACE_DB)} driver(s) loaded.")

load_known_faces()

def sound_alarm(path):
    try:
        music = pyglet.resource.media(path)
        music.play()
        pyglet.app.run()
    except Exception as e:
        print(f"Audio Error: {e}")

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

# --- INITIALIZATION ---
print("🔄 Step 2: Loading Dlib Landmarks (Drowsiness Detection)...")
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("68 face landmarks.dat")
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
(lStart, lEnd) = face_utils.FACIAL_LANDMARKS_IDXS["left_eye"]
(rStart, rEnd) = face_utils.FACIAL_LANDMARKS_IDXS["right_eye"]

print("🔄 Step 3: Initializing Webcam...")
vs = VideoStream(src=0).start() # Change to 1 if using external camera
time.sleep(2.0)

# --- MAIN LOOP ---
while True:
    frame = vs.read()
    if frame is None: break
    
    frame = imutils.resize(frame, width=450)
    frame_display = frame.copy()

    # PHASE 1: AUTHENTICATION
    if not AUTHENTICATED:
        cv2.putText(frame_display, "SYSTEM LOCKED: LOOK AT CAMERA", (10, 30), 1, 1.5, (0, 0, 255), 2)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces_fa = FA_APP.get(rgb_frame)
        
        for face in faces_fa:
            emb = face.normed_embedding
            for db_name, db_emb in FACE_DB.items():
                sim = cosine_similarity([emb], [db_emb])[0][0]
                if sim > AUTH_THRESHOLD:
                    CURRENT_DRIVER_NAME = db_name
                    AUTHENTICATED = True
                    print(f"✅ Welcome {db_name}!")
        
        cv2.imshow("Driver Management System", frame_display)
        if cv2.waitKey(1) & 0xFF == ord("q"): break
        continue

    # PHASE 2: DROWSINESS MONITORING
    if PAUSED:
        black_screen = np.zeros((450, 450, 3), dtype="uint8")
        cv2.putText(black_screen, "PULLED OVER: PRESS 'R' TO RESET", (20, 225), 1, 1.2, (255, 255, 255), 2)
        cv2.imshow("Driver Management System", black_screen)
        if cv2.waitKey(0) & 0xFF == ord("r"):
            PAUSED = False
            AUTHENTICATED = False # Force re-login
        continue

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    enhanced_gray = clahe.apply(gray)
    rects = detector(enhanced_gray, 0)

    if len(rects) == 0:
        FACE_NOT_DETECTED_COUNTER += 1
        cv2.putText(frame_display, "⚠️ NO DRIVER DETECTED", (10, 60), 1, 1.5, (0, 255, 255), 2)
        if FACE_NOT_DETECTED_COUNTER >= FACE_NOT_DETECTED_CRITICAL_PULLOVER:
            PAUSED = True
    else:
        FACE_NOT_DETECTED_COUNTER = 0
        for rect in rects:
            shape = predictor(gray, rect)
            shape = face_utils.shape_to_np(shape)
            leftEye = shape[lStart:lEnd]
            rightEye = shape[rStart:rEnd]
            ear = (eye_aspect_ratio(leftEye) + eye_aspect_ratio(rightEye)) / 2.0

            # Draw HUD
            cv2.drawContours(frame_display, [cv2.convexHull(leftEye)], -1, (0, 255, 0), 1)
            cv2.drawContours(frame_display, [cv2.convexHull(rightEye)], -1, (0, 255, 0), 1)
            cv2.putText(frame_display, f"Driver: {CURRENT_DRIVER_NAME}", (10, 20), 1, 1.2, (0, 255, 0), 2)
            cv2.putText(frame_display, f"EAR: {ear:.2f}", (300, 20), 1, 1.2, (255, 255, 255), 2)

            if ear < EYE_AR_THRESH:
                COUNTER += 1
                FINAL_COUNTER += 1
                if COUNTER >= EYE_AR_CONSEC_FRAMES:
                    cv2.putText(frame_display, "!!! SLEEP ALERT !!!", (100, 200), 1, 2, (0, 0, 255), 3)
                    if not ALARM_ON:
                        ALARM_ON = True
                        Thread(target=sound_alarm, args=("alarm.wav",)).start()
                if FINAL_COUNTER >= PULLED_OVER_FRAMES:
                    PAUSED = True
            else:
                COUNTER = 0
                FINAL_COUNTER = 0
                ALARM_ON = False

    cv2.imshow("Driver Management System", frame_display)
    if cv2.waitKey(1) & 0xFF == ord("q"): break

vs.stop()
cv2.destroyAllWindows()
