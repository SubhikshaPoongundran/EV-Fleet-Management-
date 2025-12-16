import React, { useState } from 'react';
import './CustomerDashboard.css'; // Assuming you have a CSS file for styling

const CustomerDashboard = () => {
  // State for form inputs
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    startLocation: '',
    destination: ''
  });

  // State for booking status
  const [bookingStatus, setBookingStatus] = useState({
    loading: false,
    message: '',
    assignedDriver: null
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Handle Booking Submission
  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingStatus({ loading: true, message: 'Finding the best EV for you...', assignedDriver: null });

    try {
      // API call to your Python Server (app.py)
      const response = await fetch('http://localhost:5000/api/book-ride', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingStatus({
          loading: false,
          message: 'Booking Confirmed!',
          assignedDriver: data.driverDetails // Assuming server returns driver info
        });
      } else {
        setBookingStatus({
          loading: false,
          message: `Error: ${data.message || 'Could not book ride.'}`,
          assignedDriver: null
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      setBookingStatus({
        loading: false,
        message: 'Server connection failed. Please try again.',
        assignedDriver: null
      });
    }
  };

  return (
    <div className="customer-container">
      <div className="dashboard-card">
        <h2 className="header-title">⚡ EV Fleet Booking</h2>
        <p className="header-subtitle">Book a sustainable ride instantly.</p>

        <form onSubmit={handleBooking} className="booking-form">
          
          {/* Personal Details Section */}
          <div className="form-section">
            <h3>Contact Details</h3>
            <div className="input-group">
              <label>Client Name</label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleChange}
                placeholder="+1 234 567 890"
                required
              />
            </div>
          </div>

          {/* Journey Details Section */}
          <div className="form-section">
            <h3>Journey Details</h3>
            <div className="input-group">
              <label>Current Location (Start)</label>
              <input
                type="text"
                name="startLocation"
                value={formData.startLocation}
                onChange={handleChange}
                placeholder="e.g., Central Station"
                required
              />
            </div>
            <div className="input-group">
              <label>Destination</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="e.g., City Airport"
                required
              />
            </div>
          </div>

          {/* Action Button */}
          <button 
            type="submit" 
            className="book-btn" 
            disabled={bookingStatus.loading}
          >
            {bookingStatus.loading ? 'Processing...' : 'BOOK RIDE'}
          </button>
        </form>

        {/* Status / Feedback Area */}
        {bookingStatus.message && (
          <div className={`status-message ${bookingStatus.assignedDriver ? 'success' : 'error'}`}>
            <p>{bookingStatus.message}</p>
            {bookingStatus.assignedDriver && (
              <div className="driver-card">
                <h4>Driver Assigned:</h4>
                <p><strong>Car ID:</strong> {bookingStatus.assignedDriver.carId}</p>
                <p><strong>ETA:</strong> {bookingStatus.assignedDriver.eta} mins</p>
                <p><strong>Battery:</strong> {bookingStatus.assignedDriver.batteryLevel}%</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;