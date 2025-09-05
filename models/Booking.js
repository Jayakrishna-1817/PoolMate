const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
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
    seatsBooked: {
        type: Number,
        required: true,
        min: 1
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    pickupLocation: {
        address: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        estimatedTime: Date
    },
    dropoffLocation: {
        address: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        estimatedTime: Date
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    statusHistory: [{
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        reason: String
    }],
    payment: {
        method: {
            type: String,
            enum: ['cash', 'card', 'digital_wallet'],
            default: 'cash'
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionId: String,
        paidAt: Date,
        refundedAt: Date,
        refundReason: String
    },
    lastMessageAt: Date,
    unreadMessages: {
        rider: { type: Number, default: 0 },
        driver: { type: Number, default: 0 }
    },
    riderNotes: String,
    driverNotes: String,
    cancellationReason: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient queries
BookingSchema.index({ rideId: 1, status: 1 });
BookingSchema.index({ riderId: 1, status: 1 });
BookingSchema.index({ driverId: 1, status: 1 });
BookingSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
BookingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Add status to history when status changes
BookingSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });
    }
    next();
});

// Static method to find bookings by user
BookingSchema.statics.findByUser = function(userId, userType, status = null) {
    const query = {};
    query[userType === 'rider' ? 'riderId' : 'driverId'] = userId;
    
    if (status) {
        query.status = status;
    }
    
    return this.find(query)
        .populate('rideId')
        .populate('riderId', 'firstName lastName profilePicture')
        .populate('driverId', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 });
};

// Instance method to confirm booking
BookingSchema.methods.confirm = function() {
    this.status = 'confirmed';
    return this.save();
};

// Instance method to cancel booking
BookingSchema.methods.cancel = function(reason) {
    this.status = 'cancelled';
    this.cancellationReason = reason;
    return this.save();
};

// Instance method to start ride
BookingSchema.methods.startRide = function() {
    this.status = 'in_progress';
    return this.save();
};

// Instance method to complete booking
BookingSchema.methods.complete = function() {
    this.status = 'completed';
    return this.save();
};

// Instance method to update payment status
BookingSchema.methods.updatePayment = function(paymentData) {
    Object.assign(this.payment, paymentData);
    if (paymentData.status === 'completed') {
        this.payment.paidAt = new Date();
    }
    return this.save();
};

// Instance method to update unread message count
BookingSchema.methods.updateUnreadMessages = function(userType, increment = true) {
    if (userType === 'rider' || userType === 'driver') {
        if (increment) {
            this.unreadMessages[userType]++;
        } else {
            this.unreadMessages[userType] = 0;
        }
        this.lastMessageAt = new Date();
        return this.save();
    }
    return Promise.reject(new Error('Invalid user type'));
};

module.exports = mongoose.model('Booking', BookingSchema);

