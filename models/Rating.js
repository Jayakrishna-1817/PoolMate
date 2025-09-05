const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true // One rating per booking
    },
    raterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ratedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        maxlength: 500
    },
    categories: {
        punctuality: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        cleanliness: { type: Number, min: 1, max: 5 },
        safety: { type: Number, min: 1, max: 5 },
        friendliness: { type: Number, min: 1, max: 5 }
    },
    wouldRideAgain: {
        type: Boolean,
        default: true
    },
    reportedIssues: [{
        type: String,
        enum: ['late', 'rude', 'unsafe_driving', 'vehicle_dirty', 'inappropriate_behavior', 'route_deviation', 'overcharging']
    }],
    isVisible: {
        type: Boolean,
        default: true
    },
    isReported: {
        type: Boolean,
        default: false
    },
    adminNotes: String,
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
RatingSchema.index({ ratedUserId: 1, isVisible: 1 });
RatingSchema.index({ raterId: 1 });
RatingSchema.index({ bookingId: 1 }, { unique: true });
RatingSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
RatingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to get user's average rating
RatingSchema.statics.getUserAverageRating = function(userId) {
    return this.aggregate([
        { 
            $match: { 
                ratedUserId: mongoose.Types.ObjectId(userId),
                isVisible: true 
            } 
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 },
                averageCategories: {
                    punctuality: { $avg: '$categories.punctuality' },
                    communication: { $avg: '$categories.communication' },
                    cleanliness: { $avg: '$categories.cleanliness' },
                    safety: { $avg: '$categories.safety' },
                    friendliness: { $avg: '$categories.friendliness' }
                },
                wouldRideAgainPercentage: {
                    $avg: { $cond: [{ $eq: ['$wouldRideAgain', true] }, 1, 0] }
                }
            }
        }
    ]);
};

// Static method to get user's ratings breakdown
RatingSchema.statics.getUserRatingsBreakdown = function(userId) {
    return this.aggregate([
        { 
            $match: { 
                ratedUserId: mongoose.Types.ObjectId(userId),
                isVisible: true 
            } 
        },
        {
            $group: {
                _id: '$rating',
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: -1 } }
    ]);
};

// Static method to find ratings for a user
RatingSchema.statics.findByUser = function(userId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    
    return this.find({ 
        ratedUserId: userId,
        isVisible: true 
    })
    .populate('raterId', 'firstName lastName profilePicture')
    .populate('bookingId', 'rideId createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to check if user can rate a booking
RatingSchema.statics.canRate = function(bookingId, raterId) {
    return this.findOne({ bookingId, raterId })
        .then(existingRating => !existingRating);
};

// Instance method to report rating
RatingSchema.methods.report = function(reason) {
    this.isReported = true;
    this.adminNotes = reason;
    return this.save();
};

// Instance method to hide rating
RatingSchema.methods.hide = function(reason) {
    this.isVisible = false;
    this.adminNotes = reason;
    return this.save();
};

// Static method to update user's overall rating
RatingSchema.statics.updateUserRating = async function(userId) {
    const User = mongoose.model('User'); // Assuming we have a User model
    
    const ratingStats = await this.getUserAverageRating(userId);
    
    if (ratingStats.length > 0) {
        const stats = ratingStats[0];
        
        // Update user's stats
        await User.findByIdAndUpdate(userId, {
            'stats.rating.average': Math.round(stats.averageRating * 10) / 10,
            'stats.rating.count': stats.totalRatings
        });
        
        return stats;
    }
    
    return null;
};

// Post-save hook to update user's overall rating
RatingSchema.post('save', function() {
    this.constructor.updateUserRating(this.ratedUserId);
});

module.exports = mongoose.model('Rating', RatingSchema);

