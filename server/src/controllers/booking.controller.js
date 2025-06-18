const { validationResult } = require('express-validator');
const Booking = require('../models/booking.model');
const Room = require('../models/room.model');
const Equipment = require('../models/equipment.model');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email');

/**
 * @desc    Get all bookings
 * @route   GET /api/bookings
 * @access  Private (studio_owner, staff)
 */
exports.getAllBookings = async (req, res) => {
  try {
    let query = {};

    // If user is a studio owner, only show bookings for their studios
    if (req.user.userType === 'studio_owner') {
      const studios = await Studio.find({ owner: req.user._id }).select('_id');
      const studioIds = studios.map(studio => studio._id);
      const rooms = await Room.find({ studio: { $in: studioIds } }).select('_id');
      const roomIds = rooms.map(room => room._id);
      query.room = { $in: roomIds };
    }

    // If user is staff, only show bookings for their assigned studio
    if (req.user.userType === 'staff') {
      const staff = await Staff.findOne({ user: req.user._id }).select('studio');
      if (!staff) {
        return res.status(404).json({ message: 'Staff record not found' });
      }
      const rooms = await Room.find({ studio: staff.studio }).select('_id');
      const roomIds = rooms.map(room => room._id);
      query.room = { $in: roomIds };
    }

    // Get bookings with populated data
    const bookings = await Booking.find(query)
      .populate({
        path: 'room',
        select: 'name hourlyRate studio',
        populate: {
          path: 'studio',
          select: 'name address',
        },
      })
      .populate('client', 'name email')
      .populate('equipment', 'name')
      .populate('staff', 'name')
      .sort({ startTime: 1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get all bookings error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get bookings for current user
 * @route   GET /api/bookings/user
 * @access  Private (all users)
 */
exports.getUserBookings = async (req, res) => {
  try {
    let query = {};

    // If user is a musician, only show their bookings
    if (req.user.userType === 'musician') {
      query.client = req.user._id;
    } else {
      // For studio owners and staff, use the same logic as getAllBookings
      return this.getAllBookings(req, res);
    }

    // Get bookings with populated data
    const bookings = await Booking.find(query)
      .populate({
        path: 'room',
        select: 'name hourlyRate studio',
        populate: {
          path: 'studio',
          select: 'name address',
        },
      })
      .populate('equipment', 'name')
      .populate('staff', 'name')
      .sort({ startTime: 1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get user bookings error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private (all users with appropriate access)
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'room',
        select: 'name hourlyRate studio',
        populate: {
          path: 'studio',
          select: 'name address owner',
        },
      })
      .populate('client', 'name email phone')
      .populate('equipment', 'name')
      .populate('staff', 'name');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to this booking
    const isClient = booking.client._id.toString() === req.user._id.toString();
    const isStudioOwner = booking.room.studio.owner.toString() === req.user._id.toString();
    const isStaff = req.user.userType === 'staff' && await Staff.exists({ user: req.user._id, studio: booking.room.studio._id });

    if (!isClient && !isStudioOwner && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to access this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking by ID error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private (all users)
 */
exports.createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { roomId, startTime, endTime, equipmentIds = [], staffIds = [], notes } = req.body;

  try {
    // Check if the room exists
    const room = await Room.findById(roomId).populate('studio', 'name owner');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if the room is available for the requested time
    const conflictingBooking = await Booking.findOne({
      room: roomId,
      status: { $ne: 'cancelled' },
      $or: [
        // New booking starts during an existing booking
        { startTime: { $lte: new Date(startTime) }, endTime: { $gt: new Date(startTime) } },
        // New booking ends during an existing booking
        { startTime: { $lt: new Date(endTime) }, endTime: { $gte: new Date(endTime) } },
        // New booking completely contains an existing booking
        { startTime: { $gte: new Date(startTime) }, endTime: { $lte: new Date(endTime) } },
      ],
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'Room is not available for the requested time' });
    }

    // Check if equipment exists and is available
    if (equipmentIds && equipmentIds.length > 0) {
      const equipment = await Equipment.find({ _id: { $in: equipmentIds } });
      if (equipment.length !== equipmentIds.length) {
        return res.status(400).json({ message: 'One or more equipment items not found' });
      }

      // Check if equipment is available (not being used in another booking during the same time)
      for (const equipId of equipmentIds) {
        const equipmentConflict = await Booking.findOne({
          equipment: equipId,
          status: { $ne: 'cancelled' },
          $or: [
            { startTime: { $lte: new Date(startTime) }, endTime: { $gt: new Date(startTime) } },
            { startTime: { $lt: new Date(endTime) }, endTime: { $gte: new Date(endTime) } },
            { startTime: { $gte: new Date(startTime) }, endTime: { $lte: new Date(endTime) } },
          ],
        });

        if (equipmentConflict) {
          const conflictingEquipment = await Equipment.findById(equipId);
          return res.status(400).json({
            message: `Equipment ${conflictingEquipment.name} is not available for the requested time`,
          });
        }
      }
    }

    // Check if staff exists and is available
    if (staffIds && staffIds.length > 0) {
      const staff = await Staff.find({ _id: { $in: staffIds } });
      if (staff.length !== staffIds.length) {
        return res.status(400).json({ message: 'One or more staff members not found' });
      }

      // Check if staff is available
      for (const staffId of staffIds) {
        const staffConflict = await Booking.findOne({
          staff: staffId,
          status: { $ne: 'cancelled' },
          $or: [
            { startTime: { $lte: new Date(startTime) }, endTime: { $gt: new Date(startTime) } },
            { startTime: { $lt: new Date(endTime) }, endTime: { $gte: new Date(endTime) } },
            { startTime: { $gte: new Date(startTime) }, endTime: { $lte: new Date(endTime) } },
          ],
        });

        if (staffConflict) {
          const conflictingStaff = await Staff.findById(staffId).populate('user', 'name');
          return res.status(400).json({
            message: `Staff member ${conflictingStaff.user.name} is not available for the requested time`,
          });
        }
      }
    }

    // Calculate booking duration in hours
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const durationHours = (endDate - startDate) / (1000 * 60 * 60);

    // Calculate total amount
    let totalAmount = room.hourlyRate * durationHours;

    // Create the booking
    const booking = new Booking({
      room: roomId,
      client: req.user._id,
      startTime,
      endTime,
      equipment: equipmentIds,
      staff: staffIds,
      totalAmount,
      notes,
      status: 'pending', // New bookings start as pending until confirmed
    });

    // Save booking to database
    await booking.save();

    // Send notification email to studio owner
    const studioOwner = await User.findById(room.studio.owner);
    await sendEmail({
      to: studioOwner.email,
      subject: 'New Booking Request',
      text: `A new booking request has been made for ${room.studio.name}. Please log in to confirm or reject the booking.`,
      html: `<p>A new booking request has been made for ${room.studio.name}.</p><p>Please log in to confirm or reject the booking.</p>`,
    });

    // Return the saved booking with populated data
    const savedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'room',
        select: 'name hourlyRate studio',
        populate: {
          path: 'studio',
          select: 'name address',
        },
      })
      .populate('client', 'name email')
      .populate('equipment', 'name')
      .populate('staff', 'name');

    res.status(201).json(savedBooking);
  } catch (error) {
    console.error('Create booking error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update a booking
 * @route   PUT /api/bookings/:id
 * @access  Private (booking owner, studio_owner, staff)
 */
exports.updateBooking = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission to update this booking
    const isClient = booking.client.toString() === req.user._id.toString();
    const room = await Room.findById(booking.room).populate('studio');
    const isStudioOwner = room.studio.owner.toString() === req.user._id.toString();
    const isStaff = req.user.userType === 'staff' && await Staff.exists({ user: req.user._id, studio: room.studio._id });

    if (!isClient && !isStudioOwner && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    // Different update logic based on user role
    if (isClient) {
      // Clients can only update pending bookings and only certain fields
      if (booking.status !== 'pending') {
        return res.status(400).json({ message: 'Cannot update a confirmed or cancelled booking' });
      }

      // Allow clients to update certain fields (e.g., notes, equipment)
      const { notes, equipmentIds } = req.body;
      if (notes) booking.notes = notes;
      if (equipmentIds) booking.equipment = equipmentIds;

      // Save the updated booking
      await booking.save();
    } else {
      // Studio owners and staff can update more fields
      const { status, staffIds, notes } = req.body;
      if (status) booking.status = status;
      if (staffIds) booking.staff = staffIds;
      if (notes) booking.notes = notes;

      // Save the updated booking
      await booking.save();

      // If status was updated, send notification to client
      if (status && status !== booking.status) {
        const client = await User.findById(booking.client);
        await sendEmail({
          to: client.email,
          subject: `Booking ${status === 'confirmed' ? 'Confirmed' : 'Updated'}`,
          text: `Your booking for ${room.studio.name} has been ${status === 'confirmed' ? 'confirmed' : 'updated'}. Please log in to view details.`,
          html: `<p>Your booking for ${room.studio.name} has been ${status === 'confirmed' ? 'confirmed' : 'updated'}.</p><p>Please log in to view details.</p>`,
        });
      }
    }

    // Return the updated booking with populated data
    const updatedBooking = await Booking.findById(req.params.id)
      .populate({
        path: 'room',
        select: 'name hourlyRate studio',
        populate: {
          path: 'studio',
          select: 'name address',
        },
      })
      .populate('client', 'name email')
      .populate('equipment', 'name')
      .populate('staff', 'name');

    res.json(updatedBooking);
  } catch (error) {
    console.error('Update booking error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete a booking
 * @route   DELETE /api/bookings/:id
 * @access  Private (booking owner, studio_owner, staff)
 */
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission to delete this booking
    const isClient = booking.client.toString() === req.user._id.toString();
    const room = await Room.findById(booking.room).populate('studio');
    const isStudioOwner = room.studio.owner.toString() === req.user._id.toString();
    const isStaff = req.user.userType === 'staff' && await Staff.exists({ user: req.user._id, studio: room.studio._id });

    if (!isClient && !isStudioOwner && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    // Clients can only delete pending bookings
    if (isClient && booking.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot delete a confirmed booking. Please use cancel instead.' });
    }

    // Delete the booking
    await booking.remove();

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Confirm a booking
 * @route   POST /api/bookings/:id/confirm
 * @access  Private (studio_owner, staff)
 */
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission to confirm this booking
    const room = await Room.findById(booking.room).populate('studio');
    const isStudioOwner = room.studio.owner.toString() === req.user._id.toString();
    const isStaff = req.user.userType === 'staff' && await Staff.exists({ user: req.user._id, studio: room.studio._id });

    if (!isStudioOwner && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to confirm this booking' });
    }

    // Update booking status to confirmed
    booking.status = 'confirmed';
    await booking.save();

    // Send confirmation email to client
    const client = await User.findById(booking.client);
    await sendEmail({
      to: client.email,
      subject: 'Booking Confirmed',
      text: `Your booking for ${room.studio.name} has been confirmed.`,
      html: `<p>Your booking for ${room.studio.name} has been confirmed.</p><p>Please log in to view details.</p>`,
    });

    // Return the updated booking with populated data
    const updatedBooking = await Booking.findById(req.params.id)
      .populate({
        path: 'room',
        select: 'name hourlyRate studio',
        populate: {
          path: 'studio',
          select: 'name address',
        },
      })
      .populate('client', 'name email')
      .populate('equipment', 'name')
      .populate('staff', 'name');

    res.json(updatedBooking);
  } catch (error) {
    console.error('Confirm booking error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Cancel a booking
 * @route   POST /api/bookings/:id/cancel
 * @access  Private (booking owner, studio_owner, staff)
 */
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission to cancel this booking
    const isClient = booking.client.toString() === req.user._id.toString();
    const room = await Room.findById(booking.room).populate('studio');
    const isStudioOwner = room.studio.owner.toString() === req.user._id.toString();
    const isStaff = req.user.userType === 'staff' && await Staff.exists({ user: req.user._id, studio: room.studio._id });

    if (!isClient && !isStudioOwner && !isStaff) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'No reason provided';
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = Date.now();
    await booking.save();

    // Send cancellation email to relevant parties
    const client = await User.findById(booking.client);
    const studioOwner = await User.findById(room.studio.owner);

    // Send email to client if cancelled by studio owner or staff
    if (!isClient) {
      await sendEmail({
        to: client.email,
        subject: 'Booking Cancelled',
        text: `Your booking for ${room.studio.name} has been cancelled. Reason: ${booking.cancellationReason}`,
        html: `<p>Your booking for ${room.studio.name} has been cancelled.</p><p>Reason: ${booking.cancellationReason}</p>`,
      });
    }

    // Send email to studio owner if cancelled by client
    if (isClient) {
      await sendEmail({
        to: studioOwner.email,
        subject: 'Booking Cancelled by Client',
        text: `A booking for ${room.studio.name} has been cancelled by the client. Reason: ${booking.cancellationReason}`,
        html: `<p>A booking for ${room.studio.name} has been cancelled by the client.</p><p>Reason: ${booking.cancellationReason}</p>`,
      });
    }

    // Return the updated booking with populated data
    const updatedBooking = await Booking.findById(req.params.id)
      .populate({
        path: 'room',
        select: 'name hourlyRate studio',
        populate: {
          path: 'studio',
          select: 'name address',
        },
      })
      .populate('client', 'name email')
      .populate('equipment', 'name')
      .populate('staff', 'name');

    res.json(updatedBooking);
  } catch (error) {
    console.error('Cancel booking error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
