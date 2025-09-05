const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema({
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
  
 pickup: {
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
},
  
  destination: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
  },
  
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'in_progress', 'completed'],
    default: 'pending'
  },
  
  requestTime: { type: Date, default: Date.now },
  responseTime: { type: Date },
  pickupTime: { type: Date },
  completionTime: { type: Date },
  
  estimatedDistance: { type: Number }, // in kilometers
  estimatedDuration: { type: Number }, // in minutes
  estimatedFare: { type: Number }, // in currency units
  actualFare: { type: Number },
  
  riderNotes: { type: String },
  driverNotes: { type: String },
  
  rating: {
    riderRating: { type: Number, min: 1, max: 5 },
    driverRating: { type: Number, min: 1, max: 5 },
    riderFeedback: { type: String },
    driverFeedback: { type: String }
  },
  
  // Real-time tracking data
  tracking: {
    driverLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      lastUpdated: { type: Date }
    },
    estimatedArrival: { type: Number }, // in minutes
    currentStatus: { 
      type: String, 
      enum: ['driver_en_route', 'driver_arrived', 'passenger_picked_up', 'en_route_to_destination'],
      default: 'driver_en_route'
    }
  },
  
  // Payment information
  payment: {
    method: { type: String, enum: ['cash', 'card', 'digital_wallet'], default: 'cash' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    transactionId: { type: String }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create indexes for efficient queries
rideRequestSchema.index({ riderId: 1, status: 1 });
rideRequestSchema.index({ driverId: 1, status: 1 });
rideRequestSchema.index({ status: 1, requestTime: -1 });
rideRequestSchema.index({ "pickup": "2dsphere" });
rideRequestSchema.index({ "destination": "2dsphere" });

// Update the updatedAt field before saving
rideRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to accept the ride request
rideRequestSchema.methods.accept = function(driverNotes, estimatedArrival) {
  this.status = 'accepted';
  this.responseTime = new Date();
  this.driverNotes = driverNotes || this.driverNotes;
  this.tracking.estimatedArrival = estimatedArrival;
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to reject the ride request
rideRequestSchema.methods.reject = function(reason) {
  this.status = 'rejected';
  this.responseTime = new Date();
  this.driverNotes = reason || 'Request declined';
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to cancel the ride request
rideRequestSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.riderNotes = reason || 'Request cancelled by rider';
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to start the ride
rideRequestSchema.methods.startRide = function() {
  this.status = 'in_progress';
  this.pickupTime = new Date();
  this.tracking.currentStatus = 'passenger_picked_up';
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to complete the ride
rideRequestSchema.methods.complete = function(actualFare) {
  this.status = 'completed';
  this.completionTime = new Date();
  this.actualFare = actualFare || this.estimatedFare;
  this.payment.status = 'completed';
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to update driver location
rideRequestSchema.methods.updateDriverLocation = function(latitude, longitude, estimatedArrival) {
  this.tracking.driverLocation.latitude = latitude;
  this.tracking.driverLocation.longitude = longitude;
  this.tracking.driverLocation.lastUpdated = new Date();
  if (estimatedArrival !== undefined) {
    this.tracking.estimatedArrival = estimatedArrival;
  }
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to update tracking status
rideRequestSchema.methods.updateTrackingStatus = function(status) {
  this.tracking.currentStatus = status;
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to add ratings
rideRequestSchema.methods.addRating = function(raterType, rating, feedback) {
  if (raterType === 'rider') {
    this.rating.riderRating = rating;
    this.rating.riderFeedback = feedback;
  } else if (raterType === 'driver') {
    this.rating.driverRating = rating;
    this.rating.driverFeedback = feedback;
  }
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to calculate distance between pickup and destination
rideRequestSchema.methods.calculateDistance = function() {
  const R = 6371; // Earth\'s radius in kilometers
  const lat1 = this.pickup.coordinates[1];
  const lon1 = this.pickup.coordinates[0];
  const lat2 = this.destination.coordinates[1];
  const lon2 = this.destination.coordinates[0];

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Static method to find pending requests for a driver
rideRequestSchema.statics.findPendingForDriver = function(driverId) {
  return this.find({
    driverId: driverId,
    status: 'pending'
  }).populate('riderId', 'firstName lastName phone rating').sort({ requestTime: -1 });
};

// Static method to find active requests for a rider
rideRequestSchema.statics.findActiveForRider = function(riderId) {
  return this.find({
    riderId: riderId,
    status: { $in: ['pending', 'accepted', 'in_progress'] }
  }).populate('driverId', 'firstName lastName phone vehicle rating').sort({ requestTime: -1 });
};

// Static method to find requests by status
rideRequestSchema.statics.findByStatus = function(status, limit = 50) {
  return this.find({ status: status })
    .populate('riderId', 'firstName lastName phone')
    .populate('driverId', 'firstName lastName phone vehicle')
    .sort({ requestTime: -1 })
    .limit(limit);
};

module.exports = mongoose.models.RideRequest || mongoose.model('RideRequest', rideRequestSchema);

