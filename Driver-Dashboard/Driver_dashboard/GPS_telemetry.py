import serial
import time
import json
import pynmea2
import paho.mqtt.client as mqtt

# --- CONFIGURATION ---
# Pointing to the Tailscale IP of your OTHER Raspberry Pi running server.js
SERVER_IP = "100.92.235.83" 
MQTT_PORT = 1884  
DEVICE_ID = "ev_car_01"
TOPIC = "fleet/ev/location"

# Switched to /dev/ttyS0 which is the most common port for Raspberry Pi GPIO
GPS_PORT = "/dev/ttyS0"  
BAUD_RATE = 9600

# --- MQTT CALLBACKS ---
def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        print(f"✅ Connected to Server at {SERVER_IP}")
    else:
        print(f"❌ Connection failed: {reason_code}")

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    print(f"⚠️ Disconnected from server (Code: {reason_code})")

# Initialize MQTT using the new VERSION2 API specification
try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=DEVICE_ID)
except AttributeError:
    client = mqtt.Client(client_id=DEVICE_ID)

client.on_connect = on_connect
client.on_disconnect = on_disconnect

try:
    print(f"Connecting to MQTT Broker {SERVER_IP}...")
    client.connect(SERVER_IP, MQTT_PORT, 60)
    client.loop_start()
except Exception as e:
    print(f"MQTT Error: {e}")
    exit()

print(f"🚀 Starting Direct Hardware GPS Access on {GPS_PORT}...")

try:
    # WRAPPED IN AN INFINITE LOOP: So the script never randomly exits on hardware errors!
    while True:
        try:
            # Open Serial Port directly
            with serial.Serial(GPS_PORT, BAUD_RATE, timeout=1) as ser:
                print(f"🔓 Successfully opened {GPS_PORT}. Reading data...")
                
                while True:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    
                    # Look for GPRMC which contains Lat, Lng, and Speed
                    if line.startswith('$GPRMC') or line.startswith('$GPGGA'):
                        try:
                            msg = pynmea2.parse(line)
                            
                            # Ensure we have a valid fix (latitude isn't 0)
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

                                client.publish(TOPIC, json.dumps(payload), qos=1)
                                print(f"📍 Sent GPS Update -> Lat: {payload['lat']}, Lng: {payload['lng']}, Spd: {payload['speed']} km/h")
                            
                            else:
                                print("🛰️ GPS Module searching for satellites...")
                                
                        except Exception as parse_error:
                            continue 
                            
        except serial.SerialException as e:
            print(f"❌ Serial Error: Cannot read {GPS_PORT}.")
            print(f"Details: {e}")
            print("Retrying in 5 seconds... (Press Ctrl+C to quit)")
            time.sleep(5)
            
except KeyboardInterrupt:
    print("\nStopping telemetry...")
finally:
    client.loop_stop()
    client.disconnect()
