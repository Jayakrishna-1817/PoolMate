const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'location', 'system', 'image'],
        default: 'text'
    },
    content: {
        type: String,
        required: function() {
            return this.messageType === 'text' || this.messageType === 'system';
        }
    },
    attachments: [String], // URLs to files
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    isDelivered: {
        type: Boolean,
        default: false
    },
    deliveredAt: Date,
    systemMessageType: {
        type: String,
        enum: ['booking_confirmed', 'ride_started', 'ride_completed', 'booking_cancelled', 'payment_received'],
        required: function() {
            return this.messageType === 'system';
        }
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

// Indexes for efficient queries
MessageSchema.index({ bookingId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

// Update the updatedAt field before saving
MessageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find messages for a booking
MessageSchema.statics.findByBooking = function(bookingId, limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    
    return this.find({ bookingId })
        .populate('senderId', 'firstName lastName profilePicture')
        .populate('receiverId', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to find unread messages for a user
MessageSchema.statics.findUnreadByUser = function(userId) {
    return this.find({ 
        receiverId: userId, 
        isRead: false 
    })
    .populate('senderId', 'firstName lastName profilePicture')
    .populate('bookingId', 'rideId')
    .sort({ createdAt: -1 });
};

// Instance method to mark as read
MessageSchema.methods.markAsRead = function() {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        return this.save();
    }
    return Promise.resolve(this);
};

// Instance method to mark as delivered
MessageSchema.methods.markAsDelivered = function() {
    if (!this.isDelivered) {
        this.isDelivered = true;
        this.deliveredAt = new Date();
        return this.save();
    }
    return Promise.resolve(this);
};

// Static method to create system message
MessageSchema.statics.createSystemMessage = function(bookingId, senderId, receiverId, systemMessageType, content) {
    return this.create({
        bookingId,
        senderId,
        receiverId,
        messageType: 'system',
        systemMessageType,
        content,
        isDelivered: true,
        deliveredAt: new Date()
    });
};

// Static method to get conversation summary
MessageSchema.statics.getConversationSummary = function(bookingId) {
    return this.aggregate([
        { $match: { bookingId: mongoose.Types.ObjectId(bookingId) } },
        {
            $group: {
                _id: null,
                totalMessages: { $sum: 1 },
                unreadCount: {
                    $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                },
                lastMessage: { $max: '$createdAt' },
                lastMessageContent: { $last: '$content' }
            }
        }
    ]);
};

module.exports = mongoose.model('Message', MessageSchema);

