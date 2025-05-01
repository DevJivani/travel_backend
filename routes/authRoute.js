const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendOtpEmail, sendResetEmail } = require('./emailService');
const router = express.Router();
require('dotenv').config();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Signup
router.post('/signup', async (req, res) => {
  const { name, email, password, role, hotelName, hotelLocation } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      hotelName: role === 'hotelOwner' ? hotelName : undefined,
      hotelLocation: role === 'hotelOwner' ? hotelLocation : undefined,
      otp,
      otpExpires,
      isVerified: false,
    });
    await user.save();

    if (role === 'hotelOwner' && (!hotelName || !hotelLocation)) {
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ message: 'Hotel name and location are required for hotel owners' });
    }

    await sendOtpEmail(email, name, otp);
    res.status(201).json({ message: 'OTP sent to your email. Please verify.', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    await sendWelcomeEmail(email, user.name);
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email' });
    if (user.role !== role) return res.status(400).json({ message: 'Invalid role' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const resetUrl = `http://localhost:5173/reset-password/${token}`;

    await sendResetEmail(email, resetUrl);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(400).json({ message: 'Invalid token' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;