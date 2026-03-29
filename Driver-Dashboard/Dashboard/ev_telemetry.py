import gps
import json
import time
import paho.mqtt.client as mqtt

# --- CONFIGURATION ---
SERVER_IP = "10.243.230.160"
MQTT_PORT = 1884  # MATCHED TO YOUR WORKING DUMMY SCRIPT
DEVICE_ID = "ev_car_01"
TOPIC = "fleet/ev/location"

# --- MQTT CALLBACKS ---
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Connected to Server {SERVER_IP} on port {MQTT_PORT}")
    else:
        print(f"❌ Connection failed with code {rc}")

def on_publish(client, userdata, mid):
    print(f"📡 Server Acknowledged Packet {mid}")

# Initialize MQTT
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id=DEVICE_ID)
client.on_connect = on_connect
client.on_publish = on_publish

try:
    print(f"Connecting to MQTT Broker...")
    client.connect(SERVER_IP, MQTT_PORT, 60)
    client.loop_start()
except Exception as e:
    print(f"Could not connect to MQTT. Error: {e}")
    exit()

# --- GPSD MIDDLEMAN SETUP ---
try:
    # Connect to the local gpsd daemon
    session = gps.gps(mode=gps.WATCH_ENABLE | gps.WATCH_NEWSTYLE)
except Exception as e:
    print(f"❌ Error: Cannot find gpsd middleman. Run: sudo gpsd /dev/ttyAMA0 -F /var/run/gpsd.sock")
    exit()

print("🚀 Real-Time Telemetry Started...")

try:
    while True:
        report = session.next()
        
        # TPV is the class that contains Time, Position, and Velocity
        if report['class'] == 'TPV':
            # Use getattr to avoid errors if the GPS hasn't calculated these yet
            lat = getattr(report, 'lat', 0.0)
            lon = getattr(report, 'lon', 0.0)
            speed_ms = getattr(report, 'speed', 0.0)

            # ONLY publish if we have a real location
            if lat != 0.0:
                payload = {
                    "id": DEVICE_ID,
                    "lat": round(lat, 6),
                    "lng": round(lon, 6),
                    "speed": round(speed_ms * 3.6, 2), # Convert m/s to km/h
                    "status": "ONLINE",
                    "timestamp": int(time.time())
                }
                
                json_data = json.dumps(payload)
                result = client.publish(TOPIC, json_data, qos=1)
                
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    print(f"📍 Published: Lat {lat}, Lng {lon}, Speed {payload['speed']} km/h")
                else:
                    print("⚠️ Failed to queue message to MQTT")
            else:
                print("🛰️ Waiting for GPS Satellite Lock...")
        
        time.sleep(1) # Frequency of updates

except KeyboardInterrupt:
    print("\nStopping telemetry...")
finally:
    client.loop_stop()
    client.disconnect()
