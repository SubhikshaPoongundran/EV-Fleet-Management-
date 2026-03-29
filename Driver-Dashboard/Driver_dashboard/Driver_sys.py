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
import webbrowser
import sys

# --- NEW IMPORTS ---
from ultralytics import YOLO 
import RPi.GPIO as GPIO

# --- FORCE ONNX TO USE CPU ONLY ---
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["ORT_DISABLE_OPEN_VINO"] = "1"

from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# 0. BUZZER HARDWARE SETUP
# ==========================================
BUZZER_PIN = 23
try:
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(BUZZER_PIN, GPIO.OUT)
except Exception as e:
    print(f"GPIO Setup Warning (Ignore if on PC): {e}")

def sound_buzzer(alert_type):
    try:
        if alert_type == "distraction":
            for _ in range(2):
                GPIO.output(BUZZER_PIN, GPIO.HIGH); time.sleep(0.15); GPIO.output(BUZZER_PIN, GPIO.LOW); time.sleep(0.15)
        elif alert_type in ["phone", "seatbelt", "sleep", "pullover", "emergency"]:
            for _ in range(3):
                GPIO.output(BUZZER_PIN, GPIO.HIGH); time.sleep(0.6); GPIO.output(BUZZER_PIN, GPIO.LOW); time.sleep(0.3)
        elif alert_type == "unlock":
            GPIO.output(BUZZER_PIN, GPIO.HIGH); time.sleep(0.1); GPIO.output(BUZZER_PIN, GPIO.LOW)
    except Exception:
        pass

# ==========================================
# 1. SYSTEM CONFIGURATION & MQTT
# ==========================================
MQTT_BROKER = "100.92.235.83"  
MQTT_PORT = 1884               
DEVICE_ID = "ev_car_01"
TOPIC_ALERTS = "taxi/app/driver/requests" 
TOPIC_LOCATION = "fleet/ev/location"

def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0: print(f"✅ Connected to Server at {MQTT_BROKER}")
    else: print(f"❌ MQTT Connection Failed: {reason_code}")

try: mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
except AttributeError: mqtt_client = mqtt.Client()

mqtt_client.on_connect = on_connect

print(f"📡 Connecting to MQTT Broker {MQTT_BROKER}...")
while True:
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        break 
    except TimeoutError:
        print("⏳ Connection timed out. Retrying in 5s...")
        time.sleep(5)
    except Exception as e:
        time.sleep(5)

mqtt_client.loop_start()

def send_to_dashboard(alert_type, message, status="danger"):
    payload = {
        "clientName": alert_type, 
        "fare": "SYSTEM ALERT",
        "pickupAddress": message,
        "dropAddress": "ACTION REQUIRED",
        "status": status,
        "timestamp": time.time()
    }
    mqtt_client.publish(TOPIC_ALERTS, json.dumps(payload))

# --- GLOBAL STATE AND LOCKS ---
ALARM_LOCK = Lock()
PAUSED = False
ALARM_ON = False
AUTHENTICATED = False 
CURRENT_DRIVER_NAME = "Unauthenticated"

# --- CONSTANTS ---
EYE_AR_THRESH = 0.26
EYE_AR_CONSEC_FRAMES = 20
PULLED_OVER_FRAMES =  100
FACE_LOST_ALARM_FRAMES = 20
FACE_NOT_DETECTED_CRITICAL_PULLOVER = 66

COUNTER = 0
FINAL_COUNTER = 0 
FACE_NOT_DETECTED_COUNTER = 0
YOLO_ALERT_COOLDOWNS = {}

# --- PI OPTIMIZATION: FRAME CACHING VARIABLES ---
FRAME_COUNTER = 0
LAST_YOLO_RESULTS = None
LAST_FACE_RECTS = []

# --- ARC FACE & DB SETUP ---
print("🔄 Step 1: Loading ArcFace...")
FA_APP = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
FA_APP.prepare(ctx_id=0)

FACE_DB = {}
AUTH_THRESHOLD = 0.50 

def load_known_faces():
    global FACE_DB
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

def sound_alarm(path):
    try:
        if not os.path.exists(path): return
        os.system(f"aplay -q {path}")
    except Exception as e: pass

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

print("🔄 Step 2: Loading Dlib Landmarks...")
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("68 face landmarks.dat")
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
(lStart, lEnd) = face_utils.FACIAL_LANDMARKS_IDXS["left_eye"]
(rStart, rEnd) = face_utils.FACIAL_LANDMARKS_IDXS["right_eye"]

print("🔄 Step 3: Loading YOLOv8 Model...")
yolo_model = YOLO("best.onnx", task="detect") if os.path.exists("best.onnx") else None

print("🔄 Step 4: Initializing Webcam...")
vs = VideoStream(src=0).start()
time.sleep(2.0)

print("✅ System Fully Online.")

# --- MAIN LOOP ---
while True:
    frame = vs.read()
    if frame is None: break
    frame = imutils.resize(frame, width=450)
    frame_display = frame.copy()
    
    FRAME_COUNTER += 1 # Advance the global frame clock

    # PHASE 1: AUTHENTICATION
    if not AUTHENTICATED:
        cv2.putText(frame_display, "LOCKED: SCANNING...", (10, 30), 1, 1.5, (0, 0, 255), 2)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces_fa = FA_APP.get(rgb_frame)
        
        for face in faces_fa:
            emb = face.normed_embedding
            for db_name, db_emb in FACE_DB.items():
                sim = cosine_similarity([emb], [db_emb])[0][0]
                if sim > AUTH_THRESHOLD:
                    CURRENT_DRIVER_NAME = db_name
                    AUTHENTICATED = True
                    send_to_dashboard("AUTH SUCCESS", f"Welcome back, {db_name}!", "success")
                    Thread(target=sound_buzzer, args=("unlock",)).start()
                    print(f"✅ Welcome {db_name}! Unlocking vehicle...")
        
        cv2.imshow("Driver Management System", frame_display)
        if cv2.waitKey(1) & 0xFF == ord("q"): break
        continue

    # PHASE 2: BEHAVIOR & DROWSINESS MONITORING
    if PAUSED:
        black_screen = np.zeros((450, 450, 3), dtype="uint8")
        cv2.putText(black_screen, "PULLED OVER: PRESS 'R'", (20, 225), 1, 1.2, (255, 255, 255), 2)
        cv2.imshow("Driver Management System", black_screen)
        if cv2.waitKey(0) & 0xFF == ord("r"):
            PAUSED = False
            AUTHENTICATED = False 
            send_to_dashboard("SYSTEM RESET", "Monitoring Resumed", "success")
        continue

    # --- 2A: YOLO INFERENCE (OPTIMIZED WITH SKIPPING) ---
    if yolo_model is not None:
        # PERFORMANCE HACK: Run heavy YOLO math every 5 frames (Removed imgsz=320 to fix ONNX crash)
        if FRAME_COUNTER % 5 == 0:
            LAST_YOLO_RESULTS = yolo_model.predict(source=frame_display, conf=0.50, verbose=False)
        
        # Draw the cached boxes so the video remains perfectly smooth
        if LAST_YOLO_RESULTS is not None:
            frame_display = LAST_YOLO_RESULTS[0].plot() 
            
            detected_class_indices = [int(cls) for cls in LAST_YOLO_RESULTS[0].boxes.cls]
            detected_class_names = [yolo_model.names[c] for c in detected_class_indices]
            
            current_time = time.time()
            for obj in detected_class_names:
                if obj.lower() in ["no_seatbelt", "no seatbelt"] and (current_time - YOLO_ALERT_COOLDOWNS.get("seatbelt", 0) > 5.0):
                    send_to_dashboard("VIOLATION", "No Seatbelt Detected!", "warning")
                    Thread(target=sound_buzzer, args=("seatbelt",)).start()
                    YOLO_ALERT_COOLDOWNS["seatbelt"] = current_time
                
                if obj.lower() in ["phone", "using_phone", "cellphone"] and (current_time - YOLO_ALERT_COOLDOWNS.get("phone", 0) > 5.0):
                    send_to_dashboard("DISTRACTION", "Mobile Phone Usage Detected!", "danger")
                    Thread(target=sound_buzzer, args=("phone",)).start()
                    YOLO_ALERT_COOLDOWNS["phone"] = current_time

                if obj.lower() in ["distracted"] and (current_time - YOLO_ALERT_COOLDOWNS.get("distracted", 0) > 5.0):
                    send_to_dashboard("DISTRACTION", "Eyes off the road!", "warning")
                    Thread(target=sound_buzzer, args=("distraction",)).start()
                    YOLO_ALERT_COOLDOWNS["distracted"] = current_time

    # --- 2B: DLIB DROWSINESS (OPTIMIZED WITH SKIPPING) ---
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    enhanced_gray = clahe.apply(gray)
    
    # PERFORMANCE HACK: Dlib's HOG detector is incredibly slow. Only run it every 2 frames.
    if FRAME_COUNTER % 2 == 0:
        rects = detector(enhanced_gray, 0)
        LAST_FACE_RECTS = rects
    else:
        rects = LAST_FACE_RECTS # Use the cached face location from the previous frame

    if len(rects) == 0:
        FACE_NOT_DETECTED_COUNTER += 1
        if FACE_NOT_DETECTED_COUNTER == FACE_LOST_ALARM_FRAMES:
             send_to_dashboard("DISTRACTION", "Driver not looking at road!", "warning")
             Thread(target=sound_buzzer, args=("distraction",)).start()
        
        if FACE_NOT_DETECTED_COUNTER >= FACE_NOT_DETECTED_CRITICAL_PULLOVER:
            PAUSED = True
            send_to_dashboard("EMERGENCY", "Driver Missing - Vehicle Stopped", "danger")
            Thread(target=sound_buzzer, args=("emergency",)).start()
    else:
        FACE_NOT_DETECTED_COUNTER = 0
        for rect in rects:
            # The predictor (68 points) is very fast, so we can run it every frame using the cached box
            shape = predictor(gray, rect)
            shape = face_utils.shape_to_np(shape)
            leftEye = shape[lStart:lEnd]
            rightEye = shape[rStart:rEnd]
            ear = (eye_aspect_ratio(leftEye) + eye_aspect_ratio(rightEye)) / 2.0

            cv2.drawContours(frame_display, [cv2.convexHull(leftEye)], -1, (0, 255, 0), 1)
            cv2.drawContours(frame_display, [cv2.convexHull(rightEye)], -1, (0, 255, 0), 1)
            cv2.putText(frame_display, f"EAR: {ear:.2f}", (300, 20), 1, 1.2, (255, 255, 255), 2)

            if ear < EYE_AR_THRESH:
                COUNTER += 1
                FINAL_COUNTER += 1
                if COUNTER == EYE_AR_CONSEC_FRAMES:
                    send_to_dashboard("SLEEP ALERT", "Wake up immediately!", "danger")
                    Thread(target=sound_buzzer, args=("sleep",)).start()
                    if not ALARM_ON:
                        ALARM_ON = True
                        Thread(target=sound_alarm, args=("alarm.wav",)).start()
                if FINAL_COUNTER >= PULLED_OVER_FRAMES:
                    PAUSED = True
                    send_to_dashboard("PULL OVER", "Drowsiness level critical!", "danger")
                    Thread(target=sound_buzzer, args=("pullover",)).start()
            else:
                COUNTER = 0
                FINAL_COUNTER = 0
                ALARM_ON = False

    cv2.imshow("Driver Management System", frame_display)
    if cv2.waitKey(1) & 0xFF == ord("q"): break

vs.stop()
cv2.destroyAllWindows()
try: GPIO.cleanup() 
except: pass
mqtt_client.loop_stop()
mqtt_client.disconnect()

# ==========================================
# HARDWARE GPS TELEMETRY (BACKGROUND THREAD)
# ==========================================
def gps_telemetry_loop():
    GPS_PORT = "/dev/ttyS0"  
    BAUD_RATE = 9600
    print(f"🚀 Starting Direct Hardware GPS Access on {GPS_PORT}...")
    while True:
        try:
            with serial.Serial(GPS_PORT, BAUD_RATE, timeout=1) as ser:
                while True:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith('$GPRMC') or line.startswith('$GPGGA'):
                        try:
                            msg = pynmea2.parse(line)
                            if hasattr(msg, 'latitude') and msg.latitude != 0.0:
                                speed_kmh = 0.0
                                if hasattr(msg, 'spd_over_grnd') and msg.spd_over_grnd: speed_kmh = float(msg.spd_over_grnd) * 1.852
                                payload = { "id": DEVICE_ID, "lat": round(msg.latitude, 6), "lng": round(msg.longitude, 6), "speed": round(speed_kmh, 2), "status": "ONLINE", "timestamp": int(time.time()) }
                                mqtt_client.publish(TOPIC_LOCATION, json.dumps(payload), qos=1)
                        except Exception: continue 
        except Exception: time.sleep(5)

gps_thread = Thread(target=gps_telemetry_loop, daemon=True)
gps_thread.start()
