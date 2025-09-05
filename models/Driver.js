const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  dob: { type: Date },
  city: { type: String },
  gender: { type: String },
  password: { type: String, required: true },
  
  // --- ADD THESE FIELDS FOR DRIVER AVAILABILITY AND LOCATION ---
  availability: {
    isAvailable: {
      type: Boolean,
      default: false // Drivers are offline by default
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    maxPassengers: {
      type: Number,
      default: 4 // Default capacity for a driver's vehicle
    },
    currentPassengers: {
      type: Number,
      default: 0
    }
  },
  
  currentLocation: {
    type: {
      type: String,
      enum: ["Point"], // GeoJSON type for point data
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0] // Default to 0,0 if no location is set
    },
    // You can also store latitude and longitude separately for easier access
    latitude: Number,
    longitude: Number,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  rating: {
    average: { type: Number, default: 0.0 },
    totalRatings: { type: Number, default: 0 }
  },
  
  // You might also want vehicle details here if not in Profile
  vehicle: {
    make: String,
    model: String,
    color: String,
    licensePlate: String,
    capacity: Number
  }
  // --- END OF ADDED FIELDS ---
});

// Optional: Add a 2dsphere index for geospatial queries
driverSchema.index({ "currentLocation.coordinates": "2dsphere" });

// Helper method to find nearby available drivers (if you use this)
driverSchema.statics.findNearbyAvailable = async function(lat, lng, radiusKm, limit) {
  return this.find({
    "availability.isAvailable": true,
    "currentLocation.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000 // Convert km to meters
      }
    }
  }).limit(limit);
};

// Helper method to calculate distance (if you use this)
driverSchema.methods.distanceTo = function(targetLat, targetLng) {
  if (!this.currentLocation || !this.currentLocation.latitude || !this.currentLocation.longitude) {
    return null; // Or throw an error, or return a default
  }
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (targetLat - this.currentLocation.latitude) * Math.PI / 180;
  const dLon = (targetLng - this.currentLocation.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.currentLocation.latitude * Math.PI / 180) *
    Math.cos(targetLat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

module.exports = mongoose.models.Driver || mongoose.model("Driver", driverSchema);
