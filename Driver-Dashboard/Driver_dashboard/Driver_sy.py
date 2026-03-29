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

# --- FORCE ONNX TO USE CPU ONLY ---
# This prevents the "GPU device discovery failed" crash on Raspberry Pi
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["ORT_DISABLE_OPEN_VINO"] = "1"

# Only import insightface after setting environment variables
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# 1. SYSTEM CONFIGURATION & MQTT
# ==========================================
MQTT_BROKER = "100.92.235.83"  # Tailscale Server IP
MQTT_PORT = 1884               
DEVICE_ID = "ev_car_01"

TOPIC_ALERTS = "taxi/app/driver/requests" 
TOPIC_LOCATION = "fleet/ev/location"

# Compatibility for newer Paho-MQTT versions
def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        print(f"✅ Connected to Command Center at {MQTT_BROKER}")
    else:
        print(f"❌ MQTT Connection Failed: {reason_code}")

try:
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=DEVICE_ID)
except AttributeError:
    mqtt_client = mqtt.Client(client_id=DEVICE_ID)

mqtt_client.on_connect = on_connect

print(f"📡 Connecting to Fleet Server {MQTT_BROKER}...")
while True:
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        break 
    except TimeoutError:
        print("⏳ Connection timed out. Retrying in 5 seconds...")
        time.sleep(5)
    except Exception as e:
        print(f"❌ Connection error: {e}. Retrying in 5 seconds...")
        time.sleep(5)

mqtt_client.loop_start()

def send_to_dashboard(alert_type, message, status="danger"):
    """ Sends a formatted JSON payload to the Driver Dashboard """
    payload = {
        "clientName": alert_type, 
        "fare": "SYSTEM ALERT",
        "pickupAddress": message,
        "dropAddress": "ACTION REQUIRED",
        "status": status,
        "timestamp": time.time()
    }
    mqtt_client.publish(TOPIC_ALERTS, json.dumps(payload))

# ==========================================
# 2. HARDWARE GPS TELEMETRY (BACKGROUND THREAD)
# ==========================================
def gps_telemetry_loop():
    GPS_PORT = "/dev/ttyS0"  
    BAUD_RATE = 9600
    print(f"🚀 Starting Direct Hardware GPS Access on {GPS_PORT}...")
    
    while True:
        try:
            with serial.Serial(GPS_PORT, BAUD_RATE, timeout=1) as ser:
                print(f"🔓 Successfully opened {GPS_PORT}. Reading GPS data...")
                
                while True:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith('$GPRMC') or line.startswith('$GPGGA'):
                        try:
                            msg = pynmea2.parse(line)
                            if hasattr(msg, 'latitude') and msg.latitude != 0.0:
                                speed_kmh = 0.0
                                if hasattr(msg, 'spd_over_grnd') and msg.spd_over_grnd:
                                    speed_kmh = float(msg.spd_over_grnd) * 1.852

                                payload = {
                                    "id": DEVICE_ID,
                                    "lat": round(msg.latitude, 6),
                                    "lng": round(msg.longitude, 6),
                                    "speed": round(speed_kmh, 2),
                                    "status": "ONLINE",
                                    "timestamp": int(time.time())
                                }

                                mqtt_client.publish(TOPIC_LOCATION, json.dumps(payload), qos=1)
                                # print(f"📍 Sent GPS -> Lat: {payload['lat']}, Lng: {payload['lng']}")
                        except Exception:
                            continue 
        except serial.SerialException as e:
            print(f"❌ Serial Error: Cannot read {GPS_PORT}. Retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"⚠️ General GPS Error: {e}. Retrying in 5s...")
            time.sleep(5)

# Start GPS as a background daemon thread
gps_thread = Thread(target=gps_telemetry_loop, daemon=True)
gps_thread.start()

# ==========================================
# 3. AUTO-LAUNCH HTML DASHBOARD
# ==========================================
dashboard_path = os.path.abspath("Driver_dashboard.html")
if os.path.exists(dashboard_path):
    print("🌐 Automatically opening Driver Dashboard in web browser...")
    webbrowser.open(f"file://{dashboard_path}")
else:
    print("⚠️ WARNING: Could not find 'Driver_dashboard.html' in the same folder.")

# ==========================================
# 4. FACE AUTHENTICATION & DROWSINESS (MAIN THREAD)
# ==========================================
ALARM_LOCK = Lock()
PAUSED = False
ALARM_ON = False
AUTHENTICATED = False 
CURRENT_DRIVER_NAME = "Unauthenticated"

EYE_AR_THRESH = 0.26
EYE_AR_CONSEC_FRAMES = 30
PULLED_OVER_FRAMES = 170 
FACE_LOST_ALARM_FRAMES = 60 
FACE_NOT_DETECTED_CRITICAL_PULLOVER = 200

COUNTER = 0
FINAL_COUNTER = 0 
FACE_NOT_DETECTED_COUNTER = 0

print("🔄 Step 1: Loading ArcFace Database...")
# Explicity set provider to CPU only to avoid GPU driver issues
FA_APP = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
FA_APP.prepare(ctx_id=0)

FACE_DB = {}
AUTH_THRESHOLD = 0.50 

def load_known_faces():
    global FACE_DB
    known_faces_path = "known_faces"
    if not os.path.exists(known_faces_path):
        os.makedirs(known_faces_path)
    
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
        if os.path.exists(path):
            os.system(f"aplay -q {path}")
    except Exception as e:
        pass

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

print("🔄 Step 2: Loading Dlib Landmarks...")
if not os.path.exists("68 face landmarks.dat"):
    print("❌ Error: Missing '68 face landmarks.dat'. Please download it.")
    sys.exit(1)

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("68 face landmarks.dat")
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
(lStart, lEnd) = face_utils.FACIAL_LANDMARKS_IDXS["left_eye"]
(rStart, rEnd) = face_utils.FACIAL_LANDMARKS_IDXS["right_eye"]

print("🔄 Step 3: Initializing Webcam...")
vs = VideoStream(src=0).start()
time.sleep(2.0) # Allow camera sensor to warm up completely

# Verify camera started successfully
frame = vs.read()
if frame is None:
    print("❌ Critical Error: Could not read from webcam. Check connections or try restarting.")
    sys.exit(1)

print("✅ System Fully Online.")

# MAIN CAMERA LOOP
while True:
    frame = vs.read()
    if frame is None: 
        print("⚠️ Warning: Lost connection to webcam. Attempting to recover...")
        time.sleep(1)
        continue
        
    frame = imutils.resize(frame, width=450)
    frame_display = frame.copy()

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
                    print(f"✅ Welcome {db_name}! Unlocking vehicle...")
        
        cv2.imshow("Driver Management System", frame_display)
        if cv2.waitKey(1) & 0xFF == ord("q"): break
        continue

    # PHASE 2: DROWSINESS MONITORING
    if PAUSED:
        black_screen = np.zeros((450, 450, 3), dtype="uint8")
        cv2.putText(black_screen, "PULLED OVER: PRESS 'R'", (20, 225), 1, 1.2, (255, 255, 255), 2)
        cv2.imshow("Driver Management System", black_screen)
        if cv2.waitKey(0) & 0xFF == ord("r"):
            PAUSED = False
            AUTHENTICATED = False 
            send_to_dashboard("SYSTEM RESET", "Monitoring Resumed", "success")
        continue

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    enhanced_gray = clahe.apply(gray)
    rects = detector(enhanced_gray, 0)

    if len(rects) == 0:
        FACE_NOT_DETECTED_COUNTER += 1
        if FACE_NOT_DETECTED_COUNTER == FACE_LOST_ALARM_FRAMES:
             send_to_dashboard("DISTRACTION", "Driver not looking at road!", "warning")
        
        if FACE_NOT_DETECTED_COUNTER >= FACE_NOT_DETECTED_CRITICAL_PULLOVER:
            PAUSED = True
            send_to_dashboard("EMERGENCY", "Driver Missing - Vehicle Stopped", "danger")
    else:
        FACE_NOT_DETECTED_COUNTER = 0
        for rect in rects:
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
                    if not ALARM_ON:
                        ALARM_ON = True
                        Thread(target=sound_alarm, args=("alarm.wav",)).start()
                if FINAL_COUNTER >= PULLED_OVER_FRAMES:
                    PAUSED = True
                    send_to_dashboard("PULL OVER", "Drowsiness level critical!", "danger")
            else:
                COUNTER = 0
                FINAL_COUNTER = 0
                ALARM_ON = False

    cv2.imshow("Driver Management System", frame_display)
    if cv2.waitKey(1) & 0xFF == ord("q"): break

vs.stop()
cv2.destroyAllWindows()
mqtt_client.loop_stop()
mqtt_client.disconnect()
