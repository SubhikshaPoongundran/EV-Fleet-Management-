import paho.mqtt.client as mqtt
import json
import time

# ⚠️ CHANGE THIS TO YOUR LAPTOP'S TAILSCALE IP!
BROKER_ADDRESS = "100.92.235.83" 
PORT = 1884
TOPIC = "ev/fleet/emergency"

# The emergency payload the Dashboard is waiting for
payload = {
    "type": "THEFT_DETECTED",
    "driverId": "ev_car_01",
    "location": {"lat": 11.0168, "lng": 76.9558},
    "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ')
}

print("🚨 Initiating Fake Theft Alert...")

try:
    client = mqtt.Client()
    client.connect(BROKER_ADDRESS, PORT, 60)
    
    # Publish the message
    client.publish(TOPIC, json.dumps(payload))
    print("✅ Message Sent over Tailscale! Check your React Dashboard.")
    
    client.disconnect()
except Exception as e:
    print(f"❌ Connection Failed: {e}")
    print("Make sure your Laptop Node.js server is running and Tailscale is connected!")
