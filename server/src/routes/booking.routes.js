const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get all bookings
// @access  Private (studio_owner, staff)
router.get('/', protect, bookingController.getAllBookings);

// @route   GET /api/bookings/user
// @desc    Get bookings for current user
// @access  Private (all users)
router.get('/user', protect, bookingController.getUserBookings);

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private (all users with appropriate access)
router.get('/:id', protect, bookingController.getBookingById);

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private (all users)
router.post(
  '/',
  [
    protect,
    body('roomId', 'Room ID is required').notEmpty(),
    body('startTime', 'Valid start time is required').isISO8601(),
    body('endTime', 'Valid end time is required').isISO8601(),
  ],
  bookingController.createBooking
);

// @route   PUT /api/bookings/:id
// @desc    Update a booking
// @access  Private (booking owner, studio_owner, staff)
router.put('/:id', protect, bookingController.updateBooking);

// @route   DELETE /api/bookings/:id
// @desc    Delete a booking
// @access  Private (booking owner, studio_owner, staff)
router.delete('/:id', protect, bookingController.deleteBooking);

// @route   POST /api/bookings/:id/confirm
// @desc    Confirm a booking
// @access  Private (studio_owner, staff)
router.post(
  '/:id/confirm',
  protect,
  authorize('studio_owner', 'staff'),
  bookingController.confirmBooking
);

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel a booking
// @access  Private (booking owner, studio_owner, staff)
router.post('/:id/cancel', protect, bookingController.cancelBooking);

module.exports = router;
