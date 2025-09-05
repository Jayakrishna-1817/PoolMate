const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    make: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true,
        min: 1990,
        max: new Date().getFullYear() + 1
    },
    color: {
        type: String,
        required: true
    },
    licensePlate: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    totalSeats: {
        type: Number,
        required: true,
        min: 2,
        max: 8
    },
    availableSeats: {
        type: Number,
        required: true,
        min: 1
    },
    features: {
        airConditioning: { type: Boolean, default: false },
        bluetooth: { type: Boolean, default: false },
        usbCharging: { type: Boolean, default: false },
        wifiHotspot: { type: Boolean, default: false },
        childSeat: { type: Boolean, default: false }
    },
    registration: {
        number: String,
        expiryDate: Date,
        documentUrl: String,
        verified: { type: Boolean, default: false }
    },
    insurance: {
        provider: String,
        policyNumber: String,
        expiryDate: Date,
        documentUrl: String,
        verified: { type: Boolean, default: false }
    },
    driverLicense: {
        number: String,
        expiryDate: Date,
        documentUrl: String,
        verified: { type: Boolean, default: false }
    },
    images: [String], // URLs to vehicle photos
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for driver's vehicles
VehicleSchema.index({ driverId: 1, isActive: 1 });

// Ensure license plate is unique
VehicleSchema.index({ licensePlate: 1 }, { unique: true });

// Update the updatedAt field before saving
VehicleSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Validate that available seats don't exceed total seats
VehicleSchema.pre('save', function(next) {
    if (this.availableSeats > this.totalSeats) {
        this.availableSeats = this.totalSeats - 1; // Reserve one seat for driver
    }
    next();
});

// Static method to find vehicles by driver
VehicleSchema.statics.findByDriver = function(driverId) {
    return this.find({ driverId, isActive: true });
};

// Instance method to add image
VehicleSchema.methods.addImage = function(imageUrl) {
    if (!this.images.includes(imageUrl)) {
        this.images.push(imageUrl);
        return this.save();
    }
    return Promise.resolve(this);
};

// Instance method to remove image
VehicleSchema.methods.removeImage = function(imageUrl) {
    this.images = this.images.filter(img => img !== imageUrl);
    return this.save();
};

// Instance method to update verification status
VehicleSchema.methods.updateVerification = function(documentType, verified, documentUrl = null) {
    if (this[documentType]) {
        this[documentType].verified = verified;
        if (documentUrl) {
            this[documentType].documentUrl = documentUrl;
        }
        if (verified) {
            this[documentType].verifiedAt = new Date();
        }
        return this.save();
    }
    return Promise.reject(new Error('Invalid document type'));
};

module.exports = mongoose.model('Vehicle', VehicleSchema);

