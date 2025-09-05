const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    origin: {
        address: { type: String, required: true },
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        placeId: String
    },
    destination: {
        address: { type: String, required: true },
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        placeId: String
    },
    waypoints: [{
        address: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        order: Number
    }],
    departureTime: {
        type: Date,
        required: true
    },
    estimatedArrivalTime: Date,
    actualDepartureTime: Date,
    actualArrivalTime: Date,
    availableSeats: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    pricePerSeat: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    distance: Number, // in kilometers
    estimatedDuration: Number, // in minutes
    rideType: {
        type: String,
        enum: ['one_time', 'recurring'],
        default: 'one_time'
    },
    recurringPattern: {
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly']
        },
        daysOfWeek: [Number], // 0-6, Sunday = 0
        endDate: Date
    },
    preferences: {
        smokingAllowed: { type: Boolean, default: false },
        petsAllowed: { type: Boolean, default: true },
        maxDetour: { type: Number, default: 5 }, // in kilometers
        genderPreference: {
            type: String,
            enum: ['any', 'same', 'male', 'female'],
            default: 'any'
        },
        ageRange: {
            min: { type: Number, default: 18 },
            max: { type: Number, default: 65 }
        }
    },
    status: {
        type: String,
        enum: ['active', 'full', 'completed', 'cancelled', 'in_progress'],
        default: 'active'
    },
    cancellationReason: String,
    notes: String,
    pickupInstructions: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create geospatial indexes for location-based queries
RideSchema.index({ "origin.coordinates": "2dsphere" });
RideSchema.index({ "destination.coordinates": "2dsphere" });

// Index for common queries
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ departureTime: 1, status: 1 });
RideSchema.index({ status: 1, availableSeats: 1 });

// Update the updatedAt field before saving
RideSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to search rides
RideSchema.statics.searchRides = function(searchParams) {
    const { origin, destination, departureDate, seats, maxPrice, radius = 10 } = searchParams;
    
    const query = {
        status: 'active',
        availableSeats: { $gte: seats || 1 }
    };
    
    // Add location-based search if coordinates provided
    if (origin && origin.latitude && origin.longitude) {
        query['origin.coordinates'] = {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [origin.longitude, origin.latitude]
                },
                $maxDistance: radius * 1000 // Convert km to meters
            }
        };
    }
    
    // Add date filter if provided
    if (departureDate) {
        const startOfDay = new Date(departureDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(departureDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        query.departureTime = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }
    
    // Add price filter if provided
    if (maxPrice) {
        query.pricePerSeat = { $lte: maxPrice };
    }
    
    return this.find(query)
        .populate('driverId', 'firstName lastName profilePicture stats.rating')
        .populate('vehicleId', 'make model color features')
        .sort({ departureTime: 1 });
};

// Instance method to update available seats
RideSchema.methods.updateAvailableSeats = function(seatsChange) {
    this.availableSeats = Math.max(0, this.availableSeats + seatsChange);
    
    // Update status based on available seats
    if (this.availableSeats === 0 && this.status === 'active') {
        this.status = 'full';
    } else if (this.availableSeats > 0 && this.status === 'full') {
        this.status = 'active';
    }
    
    return this.save();
};

module.exports = mongoose.model('Ride', RideSchema);

