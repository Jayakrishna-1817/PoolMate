const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  dateOfBirth: String,
  gender: String,
  city: String,
  vehicleModel: String,
  licenseNumber: String,
  emergencyName: String,
  emergencyPhone: String,
  profileImage: {
    data: Buffer,
    contentType: String
  }
});

module.exports = mongoose.models.Profile || mongoose.model("Profile", profileSchema);
