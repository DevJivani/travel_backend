const express = require('express');
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

// Get all packages
router.get('/', async (req, res) => {
  try {
    const packages = await Package.find().populate('createdBy', 'name hotelName');
    res.status(200).json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured packages
router.get('/featured', async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 }).limit(3).populate('createdBy', 'name hotelName');
    res.status(200).json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get package by ID
router.get('/:id', async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id).populate('createdBy', 'name hotelName');
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    res.status(200).json(pkg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add package (Hotel Owner only)
router.post('/', authenticate, async (req, res) => {
  if (req.user.role !== 'hotelOwner') return res.status(403).json({ message: 'Unauthorized' });

  const { title, destination, price, duration, description, image } = req.body;
  try {
    const newPackage = new Package({
      title,
      destination,
      price,
      duration,
      description,
      image,
      createdBy: req.user.id,
    });
    await newPackage.save();
    res.status(201).json(newPackage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update package (Hotel Owner only)
router.put('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'hotelOwner') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    if (pkg.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not your package' });

    const updatedPackage = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedPackage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete package (Hotel Owner only)
router.delete('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'hotelOwner') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    if (pkg.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not your package' });

    await Package.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Package deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;