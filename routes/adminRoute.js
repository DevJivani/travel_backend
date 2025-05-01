const express = require('express');
const User = require('../models/User');
const Package = require('../models/Package');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');
const router = express.Router();

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get dashboard stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalHotelOwners = await User.countDocuments({ role: 'hotelOwner' });
    const totalPackages = await Package.countDocuments();
    const totalBookings = await Booking.countDocuments();

    res.status(200).json({
      totalUsers,
      totalHotelOwners,
      totalPackages,
      totalBookings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all hotel owners
router.get('/hotel-owners', authenticate, async (req, res) => {
  try {
    const hotelOwners = await User.find({ role: 'hotelOwner' }).select('-password');
    res.status(200).json(hotelOwners);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all packages with hotel owner details
router.get('/packages', authenticate, async (req, res) => {
  try {
    const packages = await Package.find()
      .populate('createdBy', 'name email hotelName hotelLocation')
      .exec();
    res.status(200).json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all-bookings', authenticate, async (req, res) => {
  try {
    console.log('Fetching all bookings...');
    const bookings = await Booking.find()
      .populate('packageId', 'title destination price')
      .populate({
        path: 'packageId',
        populate: { path: 'createdBy', select: 'name email hotelName hotelLocation' },
      })
      .populate('userId', 'name email');
    
    console.log('Found bookings:', bookings.length);
    console.log('Sample booking:', bookings[0]);
    
    res.status(200).json(bookings);
  } catch (err) {
    console.error('Error in /all-bookings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete user
router.delete('/users/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'user') {
      return res.status(400).json({ message: 'Can only delete regular users' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete hotel owner
router.delete('/hotel-owners/:id', authenticate, async (req, res) => {
  try {
    const hotelOwner = await User.findById(req.params.id);
    if (!hotelOwner) {
      return res.status(404).json({ message: 'Hotel owner not found' });
    }
    if (hotelOwner.role !== 'hotelOwner') {
      return res.status(400).json({ message: 'User is not a hotel owner' });
    }
    
    // Delete all packages created by this hotel owner
    await Package.deleteMany({ createdBy: req.params.id });
    
    // Delete all bookings associated with those packages
    const packages = await Package.find({ createdBy: req.params.id });
    const packageIds = packages.map(pkg => pkg._id);
    await Booking.deleteMany({ packageId: { $in: packageIds } });
    
    // Finally delete the hotel owner
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Hotel owner and associated data deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete package
router.delete('/packages/:id', authenticate, async (req, res) => {
  try {
    // First check if package exists
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Delete all bookings associated with this package
    await Booking.deleteMany({ packageId: req.params.id });

    // Delete the package
    const result = await Package.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.status(200).json({ message: 'Package and associated bookings deleted successfully' });
  } catch (err) {
    console.error('Error deleting package:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete booking
router.delete('/bookings/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;