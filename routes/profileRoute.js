const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Ensure environment variables are loaded

// Middleware to verify JWT
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // Use env variable
    req.user = decoded; // Add decoded user info to request
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Routes
router.get('/', auth, profileController.getProfile); // Changed to root for fetching profile
router.put('/:email', auth, profileController.updateProfile); // Keep email parameter for PUT

router.get('/get_events', async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch events', error });
  }
});

// Add a new event
router.post('/events', async (req, res) => {
  try {
    const { title, date, location, description, type, image, createdBy } = req.body;
    console.log(req.body);
    
    const newEvent = new Event({ title, date, location, description, type, image, createdBy });
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add event', error });
  }
});

module.exports = router;