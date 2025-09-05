const mongoose = require('mongoose');

const activeRideSchema = new mongoose.Schema({
  rideRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideRequest',
    required: true
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  currentStatus: {
    type: String,
    enum: ['driver_en_route', 'arrived_at_pickup', 'passenger_picked_up', 'en_route_to_destination', 'completed', 'cancelled'],
    default: 'driver_en_route'
  },
  // FIXED: Proper GeoJSON structure for driver location
  driverLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },
  // Separate field for location metadata
  driverLocationMeta: {
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    accuracy: Number,
    source: {
      type: String,
      enum: ['gps', 'network', 'manual'],
      default: 'gps'
    }
  },
  route: {
    waypoints: [{
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(coords) {
            return coords.length === 2;
          }
        }
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    totalDistance: {
      type: Number,
      default: 0
    },
    estimatedDuration: {
      type: Number,
      default: 0
    }
  },
  timing: {
    rideStarted: {
      type: Date,
      default: Date.now
    },
    pickupTime: Date,
    dropoffTime: Date,
    completedTime: Date
  },
  metrics: {
    currentDistance: {
      type: Number,
      default: 0
    },
    averageSpeed: Number,
    maxSpeed: Number
  },
  emergency: {
    isActive: {
      type: Boolean,
      default: false
    },
    activatedAt: Date,
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    notes: String
  },
  communications: [{
    type: {
      type: String,
      enum: ['call', 'message', 'notification'],
      required: true
    },
    from: {
      type: String,
      enum: ['driver', 'rider', 'system'],
      required: true
    },
    to: {
      type: String,
      enum: ['driver', 'rider', 'system'],
      required: true
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
activeRideSchema.index({ driverLocation: '2dsphere' });

// Instance method to update driver location
activeRideSchema.methods.updateDriverLocation = function(longitude, latitude, metadata = {}) {
  // Validate coordinates
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    throw new Error('Longitude and latitude must be numbers');
  }
  
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  
  this.driverLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  
  this.driverLocationMeta = {
    lastUpdated: new Date(),
    accuracy: metadata.accuracy,
    source: metadata.source || 'gps'
  };
  
  return this.save();
};

// Static method to find nearby active rides
activeRideSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    driverLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    currentStatus: { $in: ['driver_en_route', 'arrived_at_pickup', 'passenger_picked_up', 'en_route_to_destination'] }
  });
};

module.exports = mongoose.model('ActiveRide', activeRideSchema);