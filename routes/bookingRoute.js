

const express = require('express');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const jwt = require('jsonwebtoken');
const router = express.Router();

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create booking (User only)
router.post('/', authenticate, async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ message: 'Unauthorized' });

  const { packageId, travelDate,numberOfPersons } = req.body;
  console.log(req.body)
  try {
    const booking = new Booking({
      packageId,
      userId: req.user.id,
      travelDate,
      numberOfPersons,
    });
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user bookings (User only)
router.get('/my-bookings', authenticate, async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('packageId', 'title destination price')
      .populate('userId', 'name email');
    res.status(200).json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bookings for a hotel owner’s packages (Hotel Owner only)
router.get('/hotel-bookings', authenticate, async (req, res) => {
  if (req.user.role !== 'hotelOwner') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const packages = await Package.find({ createdBy: req.user.id });
    const packageIds = packages.map((pkg) => pkg._id);
    const bookings = await Booking.find({ packageId: { $in: packageIds } })
      .populate('packageId', 'title destination price')
      .populate('userId', 'name email');
    res.status(200).json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    // Optional: Add role-based check if only admins or owners can delete
    await Booking.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;