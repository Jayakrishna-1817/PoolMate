const mongoose = require('mongoose');
const RiderSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    dob: String,
    city: String,
    gender: String,
    password: String,
    
    // Add currentLocation field to match Driver model
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
        // Store latitude and longitude separately for easier access
        latitude: Number,
        longitude: Number,
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }
});
module.exports = mongoose.model('Rider', RiderSchema);
