from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Mock Data representing the Car Nodes
car_fleet = [
    {"id": "EV-001", "driver": "Alice", "lat": 12.9716, "lng": 77.5946, "battery": 85, "status": "available"},
    {"id": "EV-002", "driver": "Bob",   "lat": 12.9250, "lng": 77.5890, "battery": 20, "status": "available"}, 
    {"id": "EV-003", "driver": "Charlie","lat": 12.9500, "lng": 77.6000, "battery": 90, "status": "busy"},
]

# --- NEW: Route for the Home Page ---
@app.route('/')
def home():
    return render_template('index.html')

# --- API Route for Booking ---
@app.route('/api/book-ride', methods=['POST'])
def book_ride():
    data = request.json
    print(f"Booking Request: {data}")

    # Logic: Find best car (Simple version)
    selected_car = None
    for car in car_fleet:
        if car['status'] == 'available' and car['battery'] > 30:
            selected_car = car
            break
    
    if selected_car:
        return jsonify({
            "message": "Driver Found",
            "driverDetails": {
                "carId": selected_car['id'],
                "driver": selected_car['driver'],
                "eta": 5,
                "batteryLevel": selected_car['battery']
            }
        }), 200
    else:
        return jsonify({"message": "No cars available"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)