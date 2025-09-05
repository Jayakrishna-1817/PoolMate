// Load environment variables
require('dotenv').config();

const nodemailer = require("nodemailer");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { sendRideRequestNotification, sendRideRequestConfirmation } = require('./models/email_notification_enhancement');
const Rider = require("./models/Rider");
const Driver = require("./models/Driver");
const Ride = require("./models/Ride");
const Profile = require("./models/Profile");
const RideRequest = require("./models/RideRequest");
const ActiveRide = require("./models/ActiveRide");
const { Server } = require("https");
const fs = require("fs");
const http = require("http");
const socketIo = require("socket.io");
const otpStore = {};
const OTP_EXPIRY = 5 * 60 * 1000;
const server = express();
const httpServer = http.createServer(server);
const io = socketIo(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('📡 User connected:', socket.id);
  
  // Join ride room for real-time updates
  socket.on('join-ride', (rideId) => {
    socket.join(`ride_${rideId}`);
    console.log(`👥 User ${socket.id} joined ride room: ride_${rideId}`);
  });
  
  // Handle location updates
  socket.on('location-update', (data) => {
    console.log('📍 Location update received:', data);
    // Broadcast to all users in the same ride room
    if (data.rideId) {
      socket.to(`ride_${data.rideId}`).emit('location-updated', data);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('📡 User disconnected:', socket.id);
  });
});

const multer = require("multer");
const cors = require("cors");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const RiderProfile = require("./models/Riderprofile");

// Use environment variables for configuration
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://jk:Jkkohli1817@book.n9xsdxj.mongodb.net/poolmate?retryWrites=true&w=majority&appName=Book";

// Enhanced MongoDB connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    if (error.message.includes('EREFUSED')) {
      console.log("💡 MongoDB Atlas cluster might be paused or network access restricted");
      console.log("💡 Please check:");
      console.log("   1. MongoDB Atlas cluster is running (not paused)");
      console.log("   2. Your IP address is whitelisted in Network Access");
      console.log("   3. Username and password are correct");
    }
    
    // Don't exit in production, continue with limited functionality
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Connect to MongoDB
connectDB();

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "poolmate2025@gmail.com",   
    pass: process.env.EMAIL_PASS || "xwdg fjej qmgb oqmi",             
  },
});

server.use(session({
  secret: process.env.SESSION_SECRET || 'poolmate-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600, // lazy session update
    ttl: 60 * 60 * 24 * 7, // 7 days TTL (in seconds, not milliseconds)
    autoRemove: 'native' // Let MongoDB handle TTL cleanup
  }),
  cookie: {
    secure: false, // Set to false for both development and production initially
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (in milliseconds)
    sameSite: 'lax' // Help with CSRF protection while allowing same-site requests
  },
  name: 'poolmate-session', // Custom session name
  rolling: true // Reset the cookie expiration on each request
}));

server.use(express.static(path.join(__dirname, "public")));
server.use("/images", express.static(path.join(__dirname, "images")));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

const requireAuth = (req, res, next) => {
  console.log('RequireAuth check:', {
    sessionExists: !!req.session,
    riderId: req.session?.riderId,
    sessionId: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (req.session && req.session.riderId) {
    return next();
  } else {
    console.log('Authentication failed - no valid riderId in session');
    return res.status(401).json({ error: "Authentication required" });
  }
};

const requireDriverAuth = (req, res, next) => {
  console.log('RequireDriverAuth check:', {
    sessionExists: !!req.session,
    driverId: req.session?.driverId,
    sessionId: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (req.session && req.session.driverId) {
    return next();
  } else {
    console.log('Driver authentication failed - no valid driverId in session');
    return res.status(401).json({ error: "Driver authentication required" });
  }
};

server.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});
server.get("/dlogin", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dlogin.html"));
});
server.get("/dsignup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dsignup.html"));
});
server.get("/rlogin", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "rlogin.html"));
});
server.get("/rsignup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "rsignup.html"));
});
server.get("/arlogin", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "arlogin.html"));
});
server.get("/adlogin", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "adlogin.html"));
});
server.get("/rprofile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "rprofile.html"));
});
server.get("/dprofile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dprofile.html"));
});
server.get("/map", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "map.html"));
});

server.get("/test-email", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "test-email.html"));
});

server.get("/test-locations", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "test-locations.html"));
});


server.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out successfully" });
  });
});

server.post("/upload-rider-profile-image", requireAuth, upload.single("profileImage"), async (req, res) => {
  try {
    const riderId = req.session.riderId;
    const rider = await Rider.findById(riderId);
    const email = rider.email;

    await RiderProfile.findOneAndUpdate(
      { email },
      {
        profileImage: {
          data: req.file.buffer,
          contentType: req.file.mimetype
        }
      },
      { new: true, upsert: true }
    );

    res.redirect("/rprofile");
  } catch (err) {
    console.error("Image upload failed:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

server.get("/api/rider-profile-image", requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId;
    const rider = await Rider.findById(riderId);
    const email = rider.email;

    const profile = await RiderProfile.findOne({ email });
    if (profile?.profileImage?.data) {
      res.set("Content-Type", profile.profileImage.contentType);
      return res.send(profile.profileImage.data);
    }
    res.redirect("/images/profile.jpeg");
  } catch (err) {
    res.redirect("/images/profile.jpeg");
  }
});

server.post('/rider-profile', requireAuth, async (req, res) => {
  const { email, dateOfBirth, gender, city, emergencyName, emergencyPhone } = req.body;

  await RiderProfile.findOneAndUpdate(
    { email },
    { dateOfBirth, gender, city, emergencyName, emergencyPhone },
    { new: true, upsert: true }
  );

  res.status(200).json({ message: "Profile updated" });
});

server.get("/api/rider-profile", requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId;
    const rider = await Rider.findById(riderId);
    if (!rider) return res.status(404).json({ error: "Rider not found" });

    const email = rider.email;
    const profile = await RiderProfile.findOne({ email });
    const rideRequests = await RideRequest.find({ riderId });
    const completedRides = rideRequests.filter(r => r.status === 'completed');
    
    const stats = {
      totalRides: completedRides.length,
      moneySaved: completedRides.reduce((total, ride) => total + (ride.estimatedFare || 0), 0),
      rating: rider.rating?.average || 0.0,
      carbonSaved: completedRides.length * 2.3 
    };
    const riderData = {
      fullName: `${rider.firstName} ${rider.lastName}`,
      email: rider.email,
      phone: rider.phone,
      dateOfBirth: profile?.dateOfBirth || "",
      gender: profile?.gender || "",
      city: profile?.city || "",
      emergencyName: profile?.emergencyName || "",
      emergencyPhone: profile?.emergencyPhone || "",
      stats: stats
    };

    res.json(riderData);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.post("/upload-profile-image", requireDriverAuth, upload.single("profileImage"), async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const driver = await Driver.findById(driverId);
    const email = driver.email;

    await Profile.findOneAndUpdate(
      { email },
      {
        profileImage: {
          data: req.file.buffer,
          contentType: req.file.mimetype
        }
      },
      { new: true, upsert: true }
    );

    res.redirect("/dprofile");
  } catch (err) {
    console.error("Image upload failed:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

server.get("/api/driver-profile-image/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      return res.redirect("/images/profile.jpeg");
    }

    const email = driver.email;
    const profile = await Profile.findOne({ email });
    
    if (profile && profile.profileImage && profile.profileImage.data) {
      res.set("Content-Type", profile.profileImage.contentType);
      return res.send(profile.profileImage.data);
    }
    res.redirect("/images/profile.jpeg");
  } catch (err) {
    res.redirect("/images/profile.jpeg");
  }
});

server.get("/api/driver-profile-image", requireDriverAuth, async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const driver = await Driver.findById(driverId);
    const email = driver.email;

    const profile = await Profile.findOne({ email });
    if (profile && profile.profileImage && profile.profileImage.data) {
      res.set("Content-Type", profile.profileImage.contentType);
      return res.send(profile.profileImage.data);
    }
    res.redirect("/images/profile.jpeg");
  } catch (err) {
    res.redirect("/images/default-avatar.jpg");
  }
});

server.post('/profile', requireDriverAuth, async (req, res) => {
  const { email } = req.body;

  const update = {
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender,
    city: req.body.city,
    vehicleModel: req.body.vehicleModel,
    licenseNumber: req.body.licenseNumber,
    emergencyName: req.body.emergencyName,
    emergencyPhone: req.body.emergencyPhone
  };

  await Profile.findOneAndUpdate({ email }, update, { new: true, upsert: true });
  res.redirect('/dprofile');
});

server.get("/api/driver-profile", requireDriverAuth, async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const email = driver.email;
    const profile = await Profile.findOne({ email });

    const driverData = {
      fullName: `${driver.firstName} ${driver.lastName}`,
      email: driver.email,
      phone: driver.phone,
      dateOfBirth: profile?.dateOfBirth || "",
      gender: profile?.gender || "",
      city: profile?.city || driver.city || "",
      vehicleModel: profile?.vehicleModel || "",
      licenseNumber: profile?.licenseNumber || "",
      emergencyName: profile?.emergencyName || "",
      emergencyPhone: profile?.emergencyPhone || "",
      isOnline: driver.availability?.isAvailable || false
    };

    res.json(driverData);
  } catch (err) {
    console.error("Error fetching driver profile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.get("/api/driver-stats", requireDriverAuth, async (req, res) => {
  try {
    const driverId = req.session.driverId;

    const rideRequests = await RideRequest.find({ driverId });
    const completedRides = rideRequests.filter(r => r.status === 'completed');
    const acceptedRides = rideRequests.filter(r => r.status === 'accepted');

    const totalEarnings = completedRides.reduce((total, ride) => total + (ride.estimatedFare || 0), 0);
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
    const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    const monthlyRides = completedRides.filter(r => new Date(r.createdAt) >= startOfMonth);
    const weeklyRides = completedRides.filter(r => new Date(r.createdAt) >= startOfWeek);
    const dailyRides = completedRides.filter(r => new Date(r.createdAt) >= startOfDay);
    
    const monthlyEarnings = monthlyRides.reduce((total, ride) => total + (ride.estimatedFare || 0), 0);
    const weeklyEarnings = weeklyRides.reduce((total, ride) => total + (ride.estimatedFare || 0), 0);
    const todayEarnings = dailyRides.reduce((total, ride) => total + (ride.estimatedFare || 0), 0);

    const driver = await Driver.findById(driverId);
    const averageRating = driver.rating?.average || 0.0;
    const totalReviews = driver.rating?.totalRatings || 0;

    const totalDistance = completedRides.length * 15; 

    const recentActivity = [];

    const recentCompletedRides = completedRides.slice(-3).reverse();
    recentCompletedRides.forEach(ride => {
      recentActivity.push({
        type: 'completed',
        text: `Completed ride from ${ride.pickup?.address || 'pickup'} to ${ride.destination?.address || 'destination'}`,
        timestamp: ride.updatedAt || ride.createdAt
      });
    });

    const recentAcceptedRides = acceptedRides.slice(-2).reverse();
    recentAcceptedRides.forEach(ride => {
      recentActivity.push({
        type: 'request',
        text: `Accepted ride request to ${ride.destination?.address || 'destination'}`,
        timestamp: ride.updatedAt || ride.createdAt
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const stats = {
      totalRides: completedRides.length,
      monthlyEarnings: monthlyEarnings,
      weeklyEarnings: weeklyEarnings,
      todayEarnings: todayEarnings,
      averageRating: averageRating,
      totalReviews: totalReviews,
      totalDistance: totalDistance,
      recentActivity: recentActivity.slice(0, 5)
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching driver stats:", err);
    res.status(500).json({ error: "Error fetching driver statistics" });
  }
});

server.post("/search", async (req, res) => {
  try {
    const { source, destination } = req.body;

    const rides = await Ride.find({
      "origin.address": source,
      "destination.address": destination,
      status: "active",
    })
      .populate("driverId", "fullName profileImage rating")
      .sort({ departureTime: 1 });

    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: "Error fetching rides" });
  }
});

server.post("/api/rsignup", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dob, city, gender, password } = req.body;

    const existingRider = await Rider.findOne({ email });
    if (existingRider) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newRider = new Rider({
      firstName,
      lastName,
      email,
      phone,
      dob,
      city,
      gender,
      password: hashedPassword,
    });

    await newRider.save();

    const mailOptions = {
      from: '"PoolMate" <poolmate2025@gmail.com>',
      to: email,
      subject: "Welcome to PoolMate - Rider Account Created",
      html: `\n        <h2>Welcome, ${firstName}!</h2>\n        <p>Your rider account has been created successfully.</p>\n        <p><b>Email:</b> ${email}<br>\n        <b>Password:</b> (hidden for security)</p>\n        <a href=\"http://localhost:3000/rlogin\" style=\"display:inline-block;padding:10px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:5px;\">Login Now</a>\n        <p>If you did not sign up, please ignore this email.</p>\n      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Rider registered successfully and email sent" });
  } catch (error) {
    console.error("Rider signup error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



server.post("/api/rlogin", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Rider login attempt:', { email, sessionId: req.sessionID });

    const rider = await Rider.findOne({ email });
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const isMatch = await bcrypt.compare(password, rider.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    req.session.riderId = rider._id;
    req.session.userType = 'rider';
    
    console.log('Before session save:', {
      riderId: req.session.riderId,
      sessionId: req.sessionID
    });

    // Ensure session is saved before sending response
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: "Login failed due to session error" });
      }

      console.log('Session saved successfully:', {
        riderId: req.session.riderId,
        sessionId: req.sessionID
      });

      res.status(200).json({
        message: "Login successful",
        rider: {
          id: rider._id,
          name: `${rider.firstName} ${rider.lastName}`,
          email: rider.email,
          city: rider.city,
        },
      });
    });
  } catch (error) {
    console.error("Rider login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

server.post("/api/driver-signup", async (req, res) => {
  const { firstName, lastName, email, phone, dob, city, gender, password } = req.body;

  try {
    if (!firstName || !lastName || !email || !phone || !dob || !city || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDriver = new Driver({
      firstName,
      lastName,
      email,
      phone,
      dob,
      city,
      gender,
      password: hashedPassword,
    });

    await newDriver.save();

    const mailOptions = {
      from: "poolmate2025@gmail.com",
      to: email,
      subject: "Welcome to PoolMate!",
      html: `\n        <h3>Hi ${firstName},</h3>\n        <p>Your driver account has been successfully created!</p>\n        <p>Email: <b>${email}</b></p>\n        <br>\n        <p>Thank you for joining PoolMate.</p>\n      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Signup successful! Email sent." });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Signup failed. Please try again later." });
  }
});

server.post("/api/driver-login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  try {
    const driver = await Driver.findOne({ email });

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, driver.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    req.session.driverId = driver._id;
    req.session.userType = 'driver';

    // Ensure session is saved before sending response
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: "Login failed due to session error" });
      }

      res.status(200).json({
        success: true,
        message: "Login successful",
        driver: {
          id: driver._id,
          name: driver.firstName + " " + driver.lastName,
          email: driver.email,
          phone: driver.phone,
          city: driver.city
        }
      });
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again."
    });
  }
});

server.get("/api/drivers", async (req, res) => {
  const { source, destination } = req.query;

  try {
    const drivers = await Driver.find({
      "source": { $regex: new RegExp(source, "i") },
      "destination": { $regex: new RegExp(destination, "i") }
    });

    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

server.post("/api/driver-send-otp", async (req, res) => {
  const { email } = req.body;
  const driver = await Driver.findOne({ email });
  if (!driver) return res.status(404).json({ message: "Email not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expires: Date.now() + OTP_EXPIRY };

  await transporter.sendMail({
    from: '"PoolMate" <poolmate2025@gmail.com>',
    to: email,
    subject: "PoolMate Password Reset OTP",
    html: `<p>Your OTP for password reset is: <b>${otp}</b></p>`,
  });

  res.json({ message: "OTP sent to your email" });
});

server.post("/api/driver-reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const record = otpStore[email];
  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }
  delete otpStore[email];

  await Driver.updateOne({ email }, { password: newPassword });
  res.json({ message: "Password updated successfully" });
});

// Rider password reset endpoints
server.post("/api/rider-send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const rider = await Rider.findOne({ email });
    if (!rider) return res.status(404).json({ message: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + OTP_EXPIRY };

    await transporter.sendMail({
      from: '"PoolMate" <poolmate2025@gmail.com>',
      to: email,
      subject: "PoolMate Password Reset OTP",
      html: `<p>Your OTP for password reset is: <b>${otp}</b></p>`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Rider send OTP error:", error);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

server.post("/api/rider-reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const record = otpStore[email];
    if (!record || record.otp !== otp || Date.now() > record.expires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    delete otpStore[email];

    await Rider.updateOne({ email }, { password: newPassword });
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Rider reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
});

// Test email endpoint to verify nodemailer configuration
server.post("/api/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log('🧪 Testing email configuration...');
    console.log('Target email:', email);

    // Test the transporter connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    const testMailOptions = {
      from: '"PoolMate Test" <poolmate2025@gmail.com>',
      to: email,
      subject: "🧪 PoolMate Email Test - Configuration Working!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #e8f5e8; border-radius: 10px; padding: 30px; text-align: center;">
            <h1 style="color: #28a745; margin: 0;">✅ Email Test Successful!</h1>
            <p style="color: #666; font-size: 16px; margin: 20px 0;">
              Your PoolMate email configuration is working correctly.
            </p>
            <p style="color: #666; font-size: 14px;">
              Test sent at: ${new Date().toLocaleString()}
            </p>
            <div style="margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <strong>Technical Details:</strong><br>
              <small>From: poolmate2025@gmail.com<br>
              To: ${email}<br>
              Service: Gmail SMTP</small>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(testMailOptions);
    
    console.log('📧 Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);

    res.json({
      success: true,
      message: "Test email sent successfully!",
      details: {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      }
    });

  } catch (error) {
    console.error('❌ Email test failed:', error);
    res.status(500).json({
      error: "Email test failed",
      details: error.message,
      code: error.code
    });
  }
});

server.get('/api/rider-profile', requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId;
    const rider = await Rider.findById(riderId).select('-password');
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    res.json(rider);
  } catch (error) {
    console.error('Error fetching rider profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

server.put('/api/update-rider-profile', requireAuth, async (req, res) => {
  try {
    const { field, value } = req.body;
    const riderId = req.session.riderId;
    
    if (!field) {
      return res.status(400).json({ message: 'Field is required' });
    }

    const update = {};
    if (field === 'fullName') {
  const [firstName, ...lastNameParts] = value.split(' ');
  update.firstName = firstName;
  update.lastName = lastNameParts.join(' ');
} 
else if (field === 'emergencyName') {
  const [name, relationPart] = value.split('(');
  update['emergencyContact.name'] = name.trim();
  if (relationPart) {
    update['emergencyContact.relation'] = relationPart.replace(')', '').trim();
  }
}
else if (field === 'emergencyPhone') {
  update['emergencyContact.phone'] = value;
}
else {
  update[field] = value;
}

const rider = await Rider.findByIdAndUpdate(
  riderId,
  { $set: update },
  { new: true }
).select('-password');

if (!rider) {
  return res.status(404).json({ message: 'Rider not found' });
}

res.json({ message: 'Profile updated successfully', rider });

  } catch (error) {
    console.error('Error updating rider profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

server.get("/api/riders/search-drivers", requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, limit = 10 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);
    const maxResults = parseInt(limit);

    const drivers = await Driver.findNearbyAvailable(lat, lng, radiusKm, maxResults);

    const formattedDrivers = drivers.map(driver => ({
      driverId: driver._id,
      name: `${driver.firstName} ${driver.lastName}`,
      rating: driver.rating.average,
      totalRatings: driver.rating.totalRatings,
      distance: driver.distanceTo(lat, lng),
      vehicle: {
        make: driver.vehicle.make,
        model: driver.vehicle.model,
        color: driver.vehicle.color,
        licensePlate: driver.vehicle.licensePlate,
        capacity: driver.vehicle.capacity
      },
      currentLocation: {
        latitude: driver.currentLocation.latitude,
        longitude: driver.currentLocation.longitude
      },
      availability: {
        maxPassengers: driver.availability.maxPassengers,
        currentPassengers: driver.availability.currentPassengers
      }
    }));

    res.json({
      success: true,
      drivers: formattedDrivers,
      totalFound: formattedDrivers.length
    });

  } catch (error) {
    console.error("Error searching drivers:", error);
    res.status(500).json({ error: "Error searching for drivers" });
  }
});

server.post("/api/ride-requests", requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId; 
    const { 
      driverId, 
      pickup, 
      destination, 
      riderNotes, 
      estimatedFare,
      riderCurrentLocation // Add this to capture rider's current location
    } = req.body;

    if (!driverId || !pickup || !destination) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(400).json({ error: "Driver not found" });
    }

    // Update rider's current location if provided
    if (riderCurrentLocation && riderCurrentLocation.latitude && riderCurrentLocation.longitude) {
      await Rider.findByIdAndUpdate(riderId, {
        $set: {
          'currentLocation.latitude': riderCurrentLocation.latitude,
          'currentLocation.longitude': riderCurrentLocation.longitude,
          'currentLocation.coordinates': [riderCurrentLocation.longitude, riderCurrentLocation.latitude],
          'currentLocation.type': 'Point',
          'currentLocation.lastUpdated': new Date()
        }
      });
      console.log(`Updated rider ${riderId} location to [${riderCurrentLocation.latitude}, ${riderCurrentLocation.longitude}]`);
    }

    const rideRequest = new RideRequest({
      riderId,
      driverId,
      pickup,
      destination,
      riderNotes,
      estimatedFare,
      estimatedDistance: 0, 
      estimatedDuration: 0
    });
    

    await rideRequest.save();

    // Get rider information for email
    const rider = await Rider.findById(riderId, 'firstName lastName phone email');
    
    console.log('📧 Preparing to send email notification...');
    console.log('Driver details:', { id: driver._id, email: driver.email, name: `${driver.firstName} ${driver.lastName}` });
    console.log('Rider details:', { id: rider._id, email: rider.email, name: `${rider.firstName} ${rider.lastName}` });

    // Send email notification to driver
    if (driver.email) {
      try {
        console.log(`📤 Attempting to send email to driver: ${driver.email}`);
        
        const mailOptions = {
          from: '"PoolMate" <poolmate2025@gmail.com>',
          to: driver.email,
          subject: "🚗 New Ride Request - PoolMate",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
              <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #007bff; margin: 0; font-size: 28px;">🚗 PoolMate</h1>
                  <p style="color: #6c757d; margin: 5px 0 0 0;">New Ride Request</p>
                </div>

                <!-- Main Content -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h2 style="color: #333; margin-top: 0;">Hello ${driver.firstName}!</h2>
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    You have received a new ride request from <strong>${rider.firstName} ${rider.lastName}</strong>.
                  </p>
                </div>

                <!-- Ride Details -->
                <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="color: #007bff; margin-top: 0; margin-bottom: 15px;">📍 Trip Details</h3>
                  
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #28a745;">📍 Pickup Location:</strong><br>
                    <span style="color: #666;">${pickup.address || pickup.name || 'Pickup Location'}</span>
                  </div>
                  
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #dc3545;">🎯 Destination:</strong><br>
                    <span style="color: #666;">${destination.address || destination.name || 'Destination'}</span>
                  </div>
                  
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #6f42c1;">💰 Estimated Fare:</strong>
                    <span style="color: #666;">₹${estimatedFare || 'To be discussed'}</span>
                  </div>
                  
                  ${riderNotes ? `
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #fd7e14;">💬 Rider Notes:</strong><br>
                    <span style="color: #666; font-style: italic;">"${riderNotes}"</span>
                  </div>
                  ` : ''}
                </div>

                <!-- Rider Information -->
                <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="color: #007bff; margin-top: 0; margin-bottom: 15px;">👤 Rider Information</h3>
                  <div style="margin-bottom: 10px;">
                    <strong>Name:</strong> ${rider.firstName} ${rider.lastName}
                  </div>
                  <div style="margin-bottom: 10px;">
                    <strong>Phone:</strong> ${rider.phone || 'Not provided'}
                  </div>
                  <div style="margin-bottom: 10px;">
                    <strong>Rating:</strong> ${rider.rating ? `⭐ ${rider.rating}/5` : 'New Rider'}
                  </div>
                </div>

                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                  <p style="color: #666; margin-bottom: 20px;">
                    Please log in to your PoolMate driver dashboard to accept or decline this request.
                  </p>
                  <a href="http://localhost:3000/dlogin" 
                     style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 0 10px;">
                    ✅ View Request
                  </a>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 14px; margin: 0;">
                    This is an automated notification from PoolMate.<br>
                    Please respond to this request as soon as possible.
                  </p>
                  <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
                    © 2025 PoolMate - Connecting Rides, Building Communities
                  </p>
                </div>

              </div>
            </div>
          `
        };

        console.log('📧 Mail options configured:', {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject
        });

        // Send the email using the fresh transporter
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email notification sent successfully!`);
        console.log('📧 Message info:', {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected
        });
        
      } catch (emailError) {
        console.error("❌ FAILED to send email notification:");
        console.error("Error type:", emailError.name);
        console.error("Error message:", emailError.message);
        console.error("Error code:", emailError.code);
        console.error("Full error:", emailError);
        
        // Check specific error types
        if (emailError.code === 'EAUTH') {
          console.error("🔐 Authentication failed - check Gmail credentials");
        } else if (emailError.code === 'ENOTFOUND') {
          console.error("🌐 Network error - check internet connection");
        } else if (emailError.code === 'ETIMEDOUT') {
          console.error("⏰ Timeout error - Gmail server might be slow");
        }
        
        // Don't fail the request if email fails
      }
    } else {
      console.log(`⚠️ No email found for driver ${driverId}, skipping email notification`);
      console.log('Driver object:', driver);
    }

    if (typeof io !== 'undefined') {
        io.to(`driver_${driverId}`).emit('new_ride_request', {
            requestId: rideRequest._id,
            rider: rider,
            pickup: pickup,
            destination: destination,
            estimatedFare: estimatedFare,
            riderNotes: riderNotes
        });
    }

    res.status(201).json({
      success: true,
      requestId: rideRequest._id,
      status: "pending",
      message: "Ride request sent to driver and email notification sent"
    });

  } catch (error) {
    console.error("Error creating ride request:", error);
    res.status(500).json({ error: "Server error while creating ride request" });
  }
});

// FIXED: Accept ride request endpoint with proper error handling
server.put("/api/ride-requests/:requestId/accept", requireDriverAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { driverNotes, estimatedArrival, driverLocation } = req.body;
    const driverId = req.session.driverId;

    console.log(`Driver ${driverId} attempting to accept request ${requestId}`);

    // Find the ride request
    const rideRequest = await RideRequest.findById(requestId);
    if (!rideRequest) {
      console.log(`Ride request ${requestId} not found`);
      return res.status(404).json({ error: "Ride request not found" });
    }

    // Check if request is still pending
    if (rideRequest.status !== 'pending') {
      console.log(`Request ${requestId} is no longer pending, current status: ${rideRequest.status}`);
      return res.status(400).json({ error: "Request is no longer pending" });
    }

    // Verify the driver is the intended recipient
    if (rideRequest.driverId.toString() !== driverId.toString()) {
      console.log(`Driver ${driverId} is not authorized to accept request ${requestId}`);
      return res.status(403).json({ error: "Not authorized to accept this request" });
    }

    // Get driver information
    const driver = await Driver.findById(driverId);
    if (!driver) {
      console.log(`Driver ${driverId} not found in database`);
      return res.status(404).json({ error: "Driver not found" });
    }

    // Update driver location if provided
    if (driverLocation && driverLocation.latitude && driverLocation.longitude) {
      const lat = parseFloat(driverLocation.latitude);
      const lng = parseFloat(driverLocation.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        await Driver.findByIdAndUpdate(driverId, {
          $set: {
            'currentLocation.latitude': lat,
            'currentLocation.longitude': lng,
            'currentLocation.coordinates': [lng, lat],
            'currentLocation.type': 'Point',
            'currentLocation.lastUpdated': new Date()
          }
        });
        console.log(`Updated driver ${driverId} location to [${lat}, ${lng}]`);
      }
    }

    // Update the ride request status
    rideRequest.status = "accepted";
    rideRequest.driverNotes = driverNotes || "Request accepted";
    rideRequest.estimatedArrival = estimatedArrival || new Date(Date.now() + 15 * 60000);
    rideRequest.acceptedAt = new Date();
    await rideRequest.save();

    console.log(`Ride request ${requestId} successfully accepted`);

    // Get updated driver with current location
    const updatedDriver = await Driver.findById(driverId);
    
    // Create active ride record
    try {
      const activeRide = new ActiveRide({
        rideRequestId: requestId,
        riderId: rideRequest.riderId,
        driverId: driverId,
        driverLocation: {
          type: "Point",
          coordinates: updatedDriver.currentLocation?.coordinates || [78.4867, 17.3850], // Default to Hyderabad
          lastUpdated: new Date()
        },
        currentStatus: "driver_en_route"
      });

      await activeRide.save();
      console.log(`Active ride created with ID: ${activeRide._id}`);
    } catch (activeRideError) {
      console.error("Error creating active ride:", activeRideError);
      // Don't fail the request acceptance if active ride creation fails
    }

    // Get rider information with current location for response
    const rider = await Rider.findById(rideRequest.riderId, 'firstName lastName phone currentLocation');

    // Prepare response with location data
    const responseData = {
      success: true,
      rideId: requestId,
      status: "accepted",
      message: "Ride request accepted successfully",
      riderContact: rider ? { 
        name: `${rider.firstName} ${rider.lastName}`, 
        phone: rider.phone 
      } : null
    };

    // Add REAL driver location if available
    if (updatedDriver.currentLocation && updatedDriver.currentLocation.latitude && updatedDriver.currentLocation.longitude) {
      responseData.driverLocation = {
        latitude: updatedDriver.currentLocation.latitude,
        longitude: updatedDriver.currentLocation.longitude,
        lastUpdated: updatedDriver.currentLocation.lastUpdated,
        type: 'driver'
      };
      console.log(`Using real driver location: [${updatedDriver.currentLocation.latitude}, ${updatedDriver.currentLocation.longitude}]`);
    } else {
      // Fallback to default location if no real location available
      responseData.driverLocation = {
        latitude: 17.3850,
        longitude: 78.4867,
        lastUpdated: new Date(),
        type: 'driver'
      };
      console.log("Using default driver location - no real location available");
    }

    // Add REAL rider location if available
    if (rider && rider.currentLocation && rider.currentLocation.latitude && rider.currentLocation.longitude) {
      responseData.riderLocation = {
        latitude: rider.currentLocation.latitude,
        longitude: rider.currentLocation.longitude,
        lastUpdated: rider.currentLocation.lastUpdated,
        type: 'rider'
      };
      console.log(`Using real rider location: [${rider.currentLocation.latitude}, ${rider.currentLocation.longitude}]`);
    } else if (rideRequest.pickup && rideRequest.pickup.coordinates && Array.isArray(rideRequest.pickup.coordinates)) {
      // Use pickup coordinates if rider's current location is not available
      responseData.riderLocation = {
        latitude: rideRequest.pickup.coordinates[1],
        longitude: rideRequest.pickup.coordinates[0],
        lastUpdated: new Date(),
        type: 'rider'
      };
      console.log(`Using pickup coordinates: [${rideRequest.pickup.coordinates[1]}, ${rideRequest.pickup.coordinates[0]}]`);
    } else {
      // Fallback to default location
      responseData.riderLocation = {
        latitude: 17.3850 + (Math.random() - 0.5) * 0.1,
        longitude: 78.4867 + (Math.random() - 0.5) * 0.1,
        lastUpdated: new Date(),
        type: 'rider'
      };
      console.log("Using default rider location - no real location or pickup coordinates available");
    }

    res.json(responseData);

  } catch (error) {
    console.error("Error accepting ride request:", error);
    res.status(500).json({ 
      error: "Internal server error while accepting request",
      details: error.message 
    });
  }
});

server.put("/api/ride-requests/:requestId/reject", requireDriverAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const rideRequest = await RideRequest.findByIdAndUpdate(requestId, {
      status: 'rejected',
      rejectionReason: reason 
    }, { new: true });
    
    if (!rideRequest) {
      return res.status(404).json({ error: "Ride request not found" });
    }

    res.json({ success: true, status: "rejected", message: "Ride request rejected" });

  } catch (error) {
    console.error("Error rejecting ride request:", error);
    res.status(500).json({ error: "Error rejecting request" });
  }
});

server.get("/api/rider/profile", requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId;
    const rider = await Rider.findById(riderId).select('-password');
    const profile = await RiderProfile.findOne({ email: rider.email });

    if (!rider) {
      return res.status(404).json({ error: "Rider not found" });
    }

    res.json({
      _id: rider._id, 
      firstName: rider.firstName,
      lastName: rider.lastName,
      email: rider.email,
      phone: rider.phone,
      city: rider.city,
      dateOfBirth: profile?.dateOfBirth || "",
      gender: profile?.gender || rider.gender,
      emergencyContact: rider.emergencyContact
    });

  } catch (err) {
    console.error("Error fetching rider profile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.get("/api/rider-bookings", requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId;
    const { filter, status } = req.query; 

    const filterParam = status || filter;

    let query = { riderId };

    if (filterParam && filterParam !== 'all') {
      if (filterParam === 'upcoming') {
        query.status = { $in: ['pending', 'accepted'] };
      } else if (filterParam.includes(',')) {
        const statusArray = filterParam.split(',').map(s => s.trim());
        query.status = { $in: statusArray };
      } else {
        query.status = filterParam; 
      }
    }

    const rideRequests = await RideRequest.find(query)
      .populate('driverId', 'firstName lastName')
      .sort({ createdAt: -1 });

    const bookings = rideRequests.map(request => ({
      id: request._id,
      status: request.status,
      origin: request.pickup?.address || request.pickup,
      destination: request.destination?.address || request.destination,
      date: request.createdAt,
      driver: request.driverId ? {
        name: `${request.driverId.firstName} ${request.driverId.lastName}`,
      } : { name: "Pending assignment"},
      price: request.estimatedFare || 0
    }));

    res.json({ success: true, bookings });

  } catch (error) {
    console.error("Error fetching rider bookings:", error);
    res.status(500).json({ error: "Error fetching rider bookings" });
  }
});

server.get("/api/rider-activity", requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId;

    const recentRequests = await RideRequest.find({ riderId })
      .populate('driverId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    const activities = recentRequests.map(request => {
      let activityType = 'booking';
      let activityText = '';
      
      switch (request.status) {
        case 'completed':
          activityType = 'completed';
          activityText = `Completed ride to ${request.destination?.address || request.destination}`;
          break;
        case 'accepted':
          activityType = 'accepted';
          activityText = `Ride accepted by ${request.driverId ? request.driverId.firstName : 'driver'}`;
          break;
        case 'cancelled':
          activityType = 'cancelled';
          activityText = `Cancelled ride to ${request.destination?.address || request.destination}`;
          break;
        case 'pending':
          activityType = 'booking';
          activityText = `Requested ride to ${request.destination?.address || request.destination}`;
          break;
        default:
          activityText = `Ride ${request.status}`;
      }

      return {
        id: request._id,
        type: activityType,
        text: activityText,
        timestamp: request.createdAt,
        status: request.status
      };
    });

    res.json({
      success: true,
      activities: activities
    });

  } catch (error) {
    console.error("Error fetching rider activity:", error);
    res.status(500).json({ error: "Error fetching rider activity" });
  }
});

server.post("/api/search-rides", requireAuth, async (req, res) => {
  try {
    const { from, to, date, time, passengers } = req.body;
    
    if (!from || !to || !date || !time) {
      return res.status(400).json({ error: "Missing required search parameters" });
    }

    console.log("Searching for all drivers with their actual online/offline status...");

    // Fetch all drivers with their availability status
    const allDrivers = await Driver.find({});
    
    console.log(`Found ${allDrivers.length} total drivers in database`);

    const driversWithProfiles = await Promise.all(
      allDrivers.map(async (driver) => {
        const profile = await Profile.findOne({ email: driver.email });
        return {
          driver,
          profile
        };
      })
    );

    const rides = driversWithProfiles.map(({ driver, profile }) => {
      // Get actual online status from driver's availability field
      const isOnline = driver.availability?.isAvailable || false;

      return {
        id: `ride_${driver._id}_${Date.now()}`,
        origin: { address: from },  
        destination: { address: to },
        departureTime: new Date(`${date}T${time}`),
        driver: {
          id: driver._id,
          name: `${driver.firstName} ${driver.lastName}`,
          rating: 4.5,
          profileImage: `/api/driver-profile-image/${driver._id}`,
          phone: driver.phone,
          email: driver.email,
          isOnline: isOnline,
          status: isOnline ? "online" : "offline"
        },
        vehicle: {
          model: profile?.vehicleModel || "Toyota Camry",
          color: "White", 
          licensePlate: profile?.licenseNumber || "ABC-123"
        },
        availableSeats: 3,
        pricePerSeat: Math.floor(Math.random() * 200) + 50,
        city: driver.city,
        status: "available",
        isOnline: isOnline,
        canAcceptRequests: isOnline // Only online drivers can accept requests
      };
    });

    const onlineDrivers = rides.filter(r => r.isOnline);
    const offlineDrivers = rides.filter(r => !r.isOnline);

    console.log(`Returning ${rides.length} total drivers: ${onlineDrivers.length} online, ${offlineDrivers.length} offline`);

    res.json({
      success: true,
      rides: rides, // Return all drivers
      totalFound: rides.length,
      onlineDrivers: onlineDrivers.length,
      offlineDrivers: offlineDrivers.length,
      message: `Found ${rides.length} drivers (${onlineDrivers.length} online, ${offlineDrivers.length} offline)`
    });

  } catch (error) {
    console.error("Error searching rides:", error);
    res.status(500).json({ error: "Error searching for rides" });
  }
});

server.post("/api/send-connection-request", requireAuth, async (req, res) => {
  try {
    const riderId = req.session.riderId;
    const { driverId, from, to, date, time, passengers, message } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: "Driver ID is required" });
    }

    const rider = await Rider.findById(riderId);
    const driver = await Driver.findById(driverId);
    
    if (!rider || !driver) {
      return res.status(404).json({ error: "Rider or driver not found" });
    }

    const generateMockCoordinates = (address) => {
      const lat = 8.0 + Math.random() * 29.0; 
      const lng = 68.0 + Math.random() * 29.0; 
      return [lng, lat]; 
    };

    const pickupCoords = generateMockCoordinates(from);
    const destinationCoords = generateMockCoordinates(to);
    const connectionRequest = new RideRequest({
      riderId: riderId,
      driverId: driverId,
      pickup: { 
        type: "Point", 
        coordinates: pickupCoords, 
        address: from
      },
      destination: { 
        type: "Point", 
        coordinates: destinationCoords, 
        address: to
      },
      requestedDate: new Date(`${date}T${time}`),
      passengers: parseInt(passengers),
      riderNotes: message || `Connection request from ${rider.firstName} ${rider.lastName}`,
      status: 'pending',
      estimatedFare: Math.floor(Math.random() * 200) + 50 
    });

    await connectionRequest.save();

    console.log(`Connection request sent from ${rider.firstName} to ${driver.firstName}`);
    console.log(`Request details:`, {
      from,
      to,
      date,
      time,
      passengers,
      message
    });

    res.json({
      success: true,
      message: `Connection request sent to ${driver.firstName} ${driver.lastName}!`,
      requestId: connectionRequest._id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      driverPhone: driver.phone
    });

  } catch (error) {
    console.error("Error sending connection request:", error);
    res.status(500).json({ error: "Error sending connection request" });
  }
});

server.get("/api/driver-connection-requests", requireDriverAuth, async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const connectionRequests = await RideRequest.find({
      driverId: driverId,
      status: 'pending',
    }).populate('riderId', 'firstName lastName phone email city');

    const formattedRequests = connectionRequests.map(request => ({
      id: request._id,
      rider: {
        id: request.riderId._id,
        name: `${request.riderId.firstName} ${request.riderId.lastName}`,
        phone: request.riderId.phone,
        email: request.riderId.email,
        city: request.riderId.city
      },
      from: request.pickup.address,
      to: request.destination.address,
      requestedDate: request.requestedDate,
      passengers: request.passengers,
      message: request.riderNotes,
      estimatedFare: request.estimatedFare,
      createdAt: request.createdAt
    }));

    res.json({
      success: true,
      requests: formattedRequests,
      totalRequests: formattedRequests.length
    });

  } catch (error) {
    console.error("Error fetching connection requests:", error);
    res.status(500).json({ error: "Error fetching connection requests" });
  }
});

server.post("/api/book-ride", requireAuth, async (req, res) => {
  try {
    const { rideId } = req.body;
    const riderId = req.session.riderId;
    
    if (!rideId) {
      return res.status(400).json({ error: "Missing rideId" });
    }

    const driverIdMatch = rideId.match(/ride_([^_]+)_/);
    if (!driverIdMatch) {
      return res.status(400).json({ error: "Invalid ride ID format" });
    }
    
    const driverId = driverIdMatch[1];
    const driver = await Driver.findById(driverId);
    if (!driver || !driver.availability.isAvailable) {
      return res.status(400).json({ error: "Driver is no longer available" });
    }
    const rideRequest = new RideRequest({
      riderId,
      driverId,
      pickup: { address: "Pickup location" }, 
      destination: { address: "Destination" }, 
      estimatedFare: Math.floor(Math.random() * 200) + 50
    });

    await rideRequest.save();

    if (typeof io !== 'undefined') {
      io.to(`driver_${driverId}`).emit('new_ride_request', {
        requestId: rideRequest._id,
        riderId: riderId
      });
    }

    res.json({
      success: true,
      message: "Ride booked successfully!",
      bookingId: rideRequest._id
    });

  } catch (error) {
    console.error("Error booking ride:", error);
    res.status(500).json({ error: "Error booking ride" });
  }
});

server.get("/api/driver-contact/:driverId", requireAuth, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const driver = await Driver.findById(driverId, 'firstName lastName phone');
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.json({
      success: true,
      name: `${driver.firstName} ${driver.lastName}`,
      phone: driver.phone
    });

  } catch (error) {
    console.error("Error fetching driver contact:", error);
    res.status(500).json({ error: "Error fetching driver contact" });
  }
});

server.post("/api/cancel-ride", requireAuth, async (req, res) => {
  try {
    const { rideId } = req.body;
    const riderId = req.session.riderId;
    
    if (!rideId) {
      return res.status(400).json({ error: "Missing rideId" });
    }

    const rideRequest = await RideRequest.findById(rideId);
    if (!rideRequest) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (rideRequest.riderId.toString() !== riderId.toString()) {
      return res.status(403).json({ error: "Unauthorized to cancel this ride" });
    }

    rideRequest.status = 'cancelled';
    rideRequest.cancelledAt = new Date();
    await rideRequest.save();

    if (typeof io !== 'undefined') {
      io.to(`driver_${rideRequest.driverId}`).emit('ride_cancelled', {
        requestId: rideRequest._id,
        riderId: riderId
      });
    }

    res.json({
      success: true,
      message: "Ride cancelled successfully"
    });

  } catch (error) {
    console.error("Error cancelling ride:", error);
    res.status(500).json({ error: "Error cancelling ride" });
  }
});

server.post("/api/rate-driver", requireAuth, async (req, res) => {
  try {
    const { driverId, rating } = req.body;
    const riderId = req.session.riderId;
    
    if (!driverId || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const existingRating = await Rating.findOne({ driverId, riderId });
    
    if (existingRating) {
      existingRating.rating = parseInt(rating);
      existingRating.updatedAt = new Date();
      await existingRating.save();
    } else {
      const newRating = new Rating({
        driverId,
        riderId,
        rating: parseInt(rating)
      });
      await newRating.save();
    }

    const allRatings = await Rating.find({ driverId });
    const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    
    driver.rating = {
      average: Math.round(averageRating * 10) / 10,
      totalRatings: allRatings.length
    };
    await driver.save();

    res.json({
      success: true,
      message: "Thank you for your rating!"
    });

  } catch (error) {
    console.error("Error rating driver:", error);
    res.status(500).json({ error: "Error submitting rating" });
  }
});

server.put("/api/driver-status", requireDriverAuth, async (req, res) => {
  try {
    const { isOnline, latitude, longitude } = req.body;
    const driverId = req.session.driverId;
    
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: "isOnline must be a boolean value" });
    }
    
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }
    
    const updateData = {
      'availability.isAvailable': isOnline,
      'availability.lastUpdated': new Date()
    };

    // Update both individual lat/lng fields AND GeoJSON coordinates
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Validate that the parsed values are valid numbers
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Invalid latitude or longitude values" });
      }
      
      updateData['currentLocation.latitude'] = lat;
      updateData['currentLocation.longitude'] = lng;
      updateData['currentLocation.coordinates'] = [lng, lat]; // GeoJSON format: [longitude, latitude]
      updateData['currentLocation.type'] = 'Point'; // Ensure GeoJSON type is set
      updateData['currentLocation.lastUpdated'] = new Date();
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedDriver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found, could not update status." 
      });
    }

    res.json({
      success: true,
      message: `Driver status updated to ${updatedDriver.availability.isAvailable ? 'online' : 'offline'}`,
      status: {
        isOnline: updatedDriver.availability.isAvailable,
        lastUpdated: updatedDriver.availability.lastUpdated,
        location: updatedDriver.currentLocation
      }
    });

  } catch (error) {
    console.error("Error updating driver status:", error);
    res.status(500).json({ error: "Error updating driver status" });
  }
});

server.get("/api/driver-status", requireDriverAuth, async (req, res) => {
  try {
    const driverId = req.session.driverId;
    
    const driver = await Driver.findById(driverId, 'availability currentLocation');
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Ensure location data is properly structured
    let locationData = {};
    if (driver.currentLocation) {
      locationData = {
        type: driver.currentLocation.type || 'Point',
        coordinates: driver.currentLocation.coordinates || [0, 0],
        latitude: driver.currentLocation.latitude || 0,
        longitude: driver.currentLocation.longitude || 0,
        lastUpdated: driver.currentLocation.lastUpdated || new Date()
      };
    }

    res.json({
      success: true,
      status: {
        isOnline: driver.availability?.isAvailable || false,
        lastUpdated: driver.availability?.lastUpdated || new Date(),
        location: locationData
      }
    });

  } catch (error) {
    console.error("Error fetching driver status:", error);
    res.status(500).json({ error: "Error fetching driver status" });
  }
});
server.post("/api/update-location", requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.session.riderId || req.session.driverId;
    const userType = req.session.userType; // 'rider' or 'driver'

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    if (userType === 'rider') {
      await Rider.findByIdAndUpdate(userId, {
        $set: {
          'currentLocation': {
            type: 'Point',
            coordinates: [longitude, latitude],
            latitude,
            longitude,
            lastUpdated: new Date()
          }
        }
      });
    } else if (userType === 'driver') {
      await Driver.findByIdAndUpdate(userId, {
        $set: {
          'currentLocation': {
            type: 'Point',
            coordinates: [longitude, latitude],
            latitude,
            longitude,
            lastUpdated: new Date()
          }
        }
      });
    }

    res.json({ success: true, message: "Location updated" });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Error updating location" });
  }
});

server.get("/api/current-location", requireAuth, async (req, res) => {
  try {
    const userId = req.session.riderId || req.session.driverId;
    const userType = req.session.userType;

    let user;
    if (userType === 'rider') {
      user = await Rider.findById(userId, 'currentLocation');
    } else if (userType === 'driver') {
      user = await Driver.findById(userId, 'currentLocation');
    }

    if (!user?.currentLocation) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json({
      latitude: user.currentLocation.latitude,
      longitude: user.currentLocation.longitude,
      lastUpdated: user.currentLocation.lastUpdated
    });
  } catch (error) {
    console.error("Error getting location:", error);
    res.status(500).json({ error: "Error getting location" });
  }
});

// Add this new endpoint to get current locations for both rider and driver during active rides
server.get("/api/ride-locations/:requestId", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const rideRequest = await RideRequest.findById(requestId);
    if (!rideRequest) {
      return res.status(404).json({ error: "Ride request not found" });
    }

    // Get current driver location
    const driver = await Driver.findById(rideRequest.driverId, 'currentLocation firstName lastName');
    // Get current rider location  
    const rider = await Rider.findById(rideRequest.riderId, 'currentLocation firstName lastName');

    const locationData = {};

    // Driver location
    if (driver && driver.currentLocation && driver.currentLocation.latitude && driver.currentLocation.longitude) {
      locationData.driverLocation = {
        latitude: driver.currentLocation.latitude,
        longitude: driver.currentLocation.longitude,
        name: `${driver.firstName} ${driver.lastName}`,
        lastUpdated: driver.currentLocation.lastUpdated,
        type: 'driver'
      };
    }

    // Rider location
    if (rider && rider.currentLocation && rider.currentLocation.latitude && rider.currentLocation.longitude) {
      locationData.riderLocation = {
        latitude: rider.currentLocation.latitude,
        longitude: rider.currentLocation.longitude,
        name: `${rider.firstName} ${rider.lastName}`,
        lastUpdated: rider.currentLocation.lastUpdated,
        type: 'rider'
      };
    }

    // Include ride request details for UI updates
    const rideDetails = {
      driver: {
        firstName: driver?.firstName || 'Unknown',
        lastName: driver?.lastName || 'Driver'
      },
      rider: {
        firstName: rider?.firstName || 'Unknown', 
        lastName: rider?.lastName || 'Rider'
      },
      pickup: rideRequest.pickup,
      destination: rideRequest.destination,
      status: rideRequest.status
    };

    res.json({
      success: true,
      locations: locationData,
      rideDetails: rideDetails
    });

  } catch (error) {
    console.error("Error fetching ride locations:", error);
    res.status(500).json({ error: "Error fetching locations" });
  }
});

// Public endpoint for ride locations (for map access without authentication)
server.get("/api/public/ride-locations/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('🌐 Public ride locations request for:', requestId);
    
    const rideRequest = await RideRequest.findById(requestId);
    if (!rideRequest) {
      console.warn('❌ Ride request not found:', requestId);
      return res.status(404).json({ error: "Ride request not found" });
    }

    console.log('✅ Found ride request:', {
      id: rideRequest._id,
      status: rideRequest.status,
      driverId: rideRequest.driverId,
      riderId: rideRequest.riderId
    });

    // Get current driver location
    const driver = await Driver.findById(rideRequest.driverId, 'currentLocation firstName lastName');
    // Get current rider location  
    const rider = await Rider.findById(rideRequest.riderId, 'currentLocation firstName lastName');

    console.log('📍 Driver data:', driver ? {
      name: `${driver.firstName} ${driver.lastName}`,
      hasLocation: !!driver.currentLocation?.latitude,
      actualLocation: driver.currentLocation ? {
        lat: driver.currentLocation.latitude,
        lng: driver.currentLocation.longitude
      } : 'No location'
    } : 'Not found');

    console.log('📍 Rider data:', rider ? {
      name: `${rider.firstName} ${rider.lastName}`,
      hasLocation: !!rider.currentLocation?.latitude,
      actualLocation: rider.currentLocation ? {
        lat: rider.currentLocation.latitude,
        lng: rider.currentLocation.longitude
      } : 'No location'
    } : 'Not found');

    const locationData = {};

    // Driver location with enhanced fallback
    if (driver && driver.currentLocation && driver.currentLocation.latitude && driver.currentLocation.longitude) {
      locationData.driverLocation = {
        latitude: driver.currentLocation.latitude,
        longitude: driver.currentLocation.longitude,
        name: `${driver.firstName} ${driver.lastName}`,
        lastUpdated: driver.currentLocation.lastUpdated || new Date().toISOString(),
        type: 'driver'
      };
    } else if (driver) {
      // Fallback location for testing
      locationData.driverLocation = {
        latitude: 28.6139,
        longitude: 77.2090,
        name: `${driver.firstName} ${driver.lastName}`,
        lastUpdated: new Date().toISOString(),
        type: 'driver'
      };
      console.log('🔄 Using fallback location for driver');
    }

    // Rider location with enhanced fallback and proper data handling
    if (rider && rider.currentLocation && rider.currentLocation.latitude && rider.currentLocation.longitude) {
      locationData.riderLocation = {
        latitude: rider.currentLocation.latitude,
        longitude: rider.currentLocation.longitude,
        name: `${rider.firstName} ${rider.lastName}`,
        lastUpdated: rider.currentLocation.lastUpdated || new Date().toISOString(),
        type: 'rider'
      };
      console.log('✅ Using REAL rider location:', locationData.riderLocation);
    } else if (rider) {
      // Try to use pickup location from ride request if available
      if (rideRequest.pickup && rideRequest.pickup.coordinates && rideRequest.pickup.coordinates.length === 2) {
        locationData.riderLocation = {
          latitude: rideRequest.pickup.coordinates[1], // coordinates are [lng, lat]
          longitude: rideRequest.pickup.coordinates[0],
          name: `${rider.firstName} ${rider.lastName}`,
          lastUpdated: new Date().toISOString(),
          type: 'rider'
        };
        console.log('🔄 Using PICKUP location for rider:', locationData.riderLocation);
      } else {
        // Last resort - use a different fallback location for rider (not same as driver)
        locationData.riderLocation = {
          latitude: 28.6289, // Connaught Place coordinates - different from driver
          longitude: 77.2167,
          name: `${rider.firstName} ${rider.lastName}`,
          lastUpdated: new Date().toISOString(),
          type: 'rider'
        };
        console.log('🔄 Using different fallback location for rider:', locationData.riderLocation);
      }
    }

    // Validate that rider and driver don't have identical coordinates
    if (locationData.driverLocation && locationData.riderLocation) {
      const latDiff = Math.abs(locationData.driverLocation.latitude - locationData.riderLocation.latitude);
      const lngDiff = Math.abs(locationData.driverLocation.longitude - locationData.riderLocation.longitude);
      
      // If coordinates are too close (within 0.001 degrees ~= 100 meters), force different locations
      if (latDiff < 0.001 && lngDiff < 0.001) {
        console.log('⚠️ Rider and driver locations are identical or too close, forcing different locations');
        
        // Force driver to Delhi Red Fort
        locationData.driverLocation = {
          latitude: 28.6562,
          longitude: 77.2410,
          name: locationData.driverLocation.name,
          lastUpdated: new Date().toISOString(),
          type: 'driver'
        };
        
        // Force rider to India Gate (distinctly different location)
        locationData.riderLocation = {
          latitude: 28.6129,
          longitude: 77.2295,
          name: locationData.riderLocation.name,
          lastUpdated: new Date().toISOString(),
          type: 'rider'
        };
        
        console.log('✅ Forced different locations - Driver: Red Fort, Rider: India Gate');
      }
    }

    // Include ride request details for UI updates
    const rideDetails = {
      driver: {
        firstName: driver?.firstName || 'Driver',
        lastName: driver?.lastName || 'Name'
      },
      rider: {
        firstName: rider?.firstName || 'Rider', 
        lastName: rider?.lastName || 'Name'
      },
      pickup: rideRequest.pickup || { address: 'Pickup Location' },
      destination: rideRequest.destination || { address: 'Destination' },
      from: rideRequest.pickup?.address || 'Pickup Location',
      to: rideRequest.destination?.address || 'Destination',
      status: rideRequest.status
    };

    console.log('📦 Sending response with locations:', Object.keys(locationData));

    res.json({
      success: true,
      locations: locationData,
      rideDetails: rideDetails,
      message: 'Ride locations retrieved successfully'
    });

  } catch (error) {
    console.error("❌ Error fetching public ride locations:", error);
    res.status(500).json({ 
      error: "Error fetching locations",
      details: error.message
    });
  }
});

// Test endpoint to verify data structure
server.get("/api/test/ride-data", (req, res) => {
  console.log('🧪 Test ride data endpoint called');
  
  const testRideData = {
    success: true,
    locations: {
      driverLocation: {
        latitude: 28.6139,
        longitude: 77.2090,
        name: 'Test Driver',
        lastUpdated: new Date().toISOString(),
        type: 'driver'
      },
      riderLocation: {
        latitude: 28.6289, // Clearly different location
        longitude: 77.2167,
        name: 'Test Rider',
        lastUpdated: new Date().toISOString(),
        type: 'rider'
      }
    },
    rideDetails: {
      driver: {
        firstName: 'Test',
        lastName: 'Driver'
      },
      rider: {
        firstName: 'Test',
        lastName: 'Rider'
      },
      pickup: { address: 'Test Pickup Location' },
      destination: { address: 'Test Destination' },
      from: 'Test Pickup Location',
      to: 'Test Destination',
      status: 'accepted'
    },
    message: 'Test data retrieved successfully'
  };
  
  res.json(testRideData);
});

// Public endpoint to update rider location (for testing without authentication)
server.post("/api/public/update-rider-location", async (req, res) => {
  try {
    const { riderId, latitude, longitude } = req.body;
    
    console.log('🔧 Public rider location update:', { riderId, latitude, longitude });

    if (!riderId || !latitude || !longitude) {
      return res.status(400).json({ error: "riderId, latitude and longitude are required" });
    }

    // Force update with proper structure
    const updateData = {
      'currentLocation.type': 'Point',
      'currentLocation.coordinates': [longitude, latitude],
      'currentLocation.latitude': latitude,
      'currentLocation.longitude': longitude,
      'currentLocation.lastUpdated': new Date()
    };

    console.log('🔧 Update data being sent to database:', updateData);

    const result = await Rider.findByIdAndUpdate(
      riderId, 
      { $set: updateData },
      { 
        new: true, 
        runValidators: false, // Skip validation to allow schema updates
        strict: false // Allow fields not in schema
      }
    );

    if (!result) {
      return res.status(404).json({ error: "Rider not found" });
    }

    console.log('✅ Rider location updated successfully. Result:', {
      riderId,
      newLocation: result.currentLocation
    });

    res.json({ 
      success: true, 
      message: "Rider location updated",
      location: { latitude, longitude, lastUpdated: new Date() },
      updatedRider: {
        id: result._id,
        name: `${result.firstName} ${result.lastName}`,
        currentLocation: result.currentLocation
      }
    });
  } catch (error) {
    console.error("❌ Error updating rider location:", error);
    res.status(500).json({ error: "Error updating rider location", details: error.message });
  }
});

// Public endpoint to update driver location (for testing without authentication)
server.post("/api/public/update-driver-location", async (req, res) => {
  try {
    const { driverId, latitude, longitude } = req.body;
    
    console.log('🔧 Public driver location update:', { driverId, latitude, longitude });

    if (!driverId || !latitude || !longitude) {
      return res.status(400).json({ error: "driverId, latitude and longitude are required" });
    }

    const result = await Driver.findByIdAndUpdate(driverId, {
      $set: {
        'currentLocation': {
          type: 'Point',
          coordinates: [longitude, latitude],
          latitude,
          longitude,
          lastUpdated: new Date()
        }
      }
    }, { new: true });

    if (!result) {
      return res.status(404).json({ error: "Driver not found" });
    }

    console.log('✅ Driver location updated successfully:', {
      driverId,
      newLocation: { latitude, longitude }
    });

    res.json({ 
      success: true, 
      message: "Driver location updated",
      location: { latitude, longitude, lastUpdated: new Date() }
    });
  } catch (error) {
    console.error("❌ Error updating driver location:", error);
    res.status(500).json({ error: "Error updating driver location" });
  }
});

// Debug endpoint to check actual data in database
server.get("/api/debug/ride-data/:rideId", async (req, res) => {
  try {
    const { rideId } = req.params;
    console.log('🔍 Debug: Checking ride data for:', rideId);
    
    // Get the ride request
    const rideRequest = await RideRequest.findById(rideId);
    if (!rideRequest) {
      return res.status(404).json({ error: "Ride request not found" });
    }
    
    // Get raw driver data
    const driver = await Driver.findById(rideRequest.driverId);
    // Get raw rider data  
    const rider = await Rider.findById(rideRequest.riderId);
    
    console.log('🔍 Raw driver data:', {
      id: driver?._id,
      name: driver ? `${driver.firstName} ${driver.lastName}` : 'Not found',
      currentLocation: driver?.currentLocation,
      hasCurrentLocation: !!driver?.currentLocation
    });
    
    console.log('🔍 Raw rider data:', {
      id: rider?._id,
      name: rider ? `${rider.firstName} ${rider.lastName}` : 'Not found',
      currentLocation: rider?.currentLocation,
      hasCurrentLocation: !!rider?.currentLocation
    });
    
    res.json({
      success: true,
      rideRequest: {
        id: rideRequest._id,
        driverId: rideRequest.driverId,
        riderId: rideRequest.riderId,
        status: rideRequest.status,
        pickup: rideRequest.pickup,
        destination: rideRequest.destination
      },
      driver: driver ? {
        id: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        email: driver.email,
        currentLocation: driver.currentLocation
      } : null,
      rider: rider ? {
        id: rider._id,
        name: `${rider.firstName} ${rider.lastName}`,
        email: rider.email,
        currentLocation: rider.currentLocation
      } : null
    });
    
  } catch (error) {
    console.error("❌ Debug error:", error);
    res.status(500).json({ error: "Debug error", details: error.message });
  }
});

// Test endpoint to set sample locations for testing
server.post("/api/test/set-locations", async (req, res) => {
  try {
    const { rideId } = req.body;
    console.log('🧪 Setting test locations for ride:', rideId);
    
    if (!rideId) {
      return res.status(400).json({ error: "rideId is required" });
    }

    // Find the ride request
    const rideRequest = await RideRequest.findById(rideId);
    if (!rideRequest) {
      return res.status(404).json({ error: "Ride request not found" });
    }

    // Set driver location (Delhi area)
    await Driver.findByIdAndUpdate(rideRequest.driverId, {
      $set: {
        'currentLocation': {
          type: 'Point',
          coordinates: [77.2090, 28.6139], // [longitude, latitude]
          latitude: 28.6139,
          longitude: 77.2090,
          lastUpdated: new Date()
        }
      }
    });

    // Set rider location (Delhi area - different location)
    await Rider.findByIdAndUpdate(rideRequest.riderId, {
      $set: {
        'currentLocation': {
          type: 'Point',
          coordinates: [77.1025, 28.7041], // [longitude, latitude]  
          latitude: 28.7041,
          longitude: 77.1025,
          lastUpdated: new Date()
        }
      }
    });

    console.log('✅ Test locations set successfully');

    res.json({ 
      success: true, 
      message: "Test locations set for both driver and rider",
      driverLocation: { latitude: 28.6139, longitude: 77.2090 },
      riderLocation: { latitude: 28.7041, longitude: 77.1025 }
    });
  } catch (error) {
    console.error("❌ Error setting test locations:", error);
    res.status(500).json({ error: "Error setting test locations" });
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Enhanced Carpooling Server is running at http://localhost:${PORT}`);
  console.log(`Session management enabled for authentication`);
  console.log(`Socket.io enabled for real-time communication`);
});

module.exports = server;