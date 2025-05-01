const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  travelDate: { type: Date, required: true },
  numberOfPersons: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);