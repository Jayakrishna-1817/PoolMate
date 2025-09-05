const mongoose = require("mongoose");

const riderProfileSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  dateOfBirth: String,
  gender: String,
  city: String,
  emergencyName: String,
  emergencyPhone: String,
  profileImage: {
    data: Buffer,
    contentType: String
  }
});

module.exports = mongoose.models.RiderProfile || mongoose.model("RiderProfile", riderProfileSchema);
