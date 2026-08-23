const express = require("express");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Seat = require("../models/Seat");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
const MAX_SEATS_PER_BOOKING = 6;

class BookingConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "BookingConflictError";
  }
}

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const hasDuplicateSeatIds = (seatIds) => {
  const uniqueSeatIds = new Set(seatIds.map((seatId) => String(seatId)));
  return uniqueSeatIds.size !== seatIds.length;
};

const idsMatch = (firstId, secondId) => {
  return String(firstId) === String(secondId);
};

const generateBookingReference = () => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TKT-${timestamp}-${randomPart}`;
};

const buildQrCode = async (booking, eventId, userId) => {
  const qrCodeData = {
    bookingReference: booking.bookingReference,
    bookingId: booking._id,
    eventId,
    userId
  };

  return QRCode.toDataURL(JSON.stringify(qrCodeData));
};

const formatBookingResponse = (booking) => {
  return {
    id: booking._id,
    bookingReference: booking.bookingReference,
    event: booking.event,
    seats: booking.seats,
    totalAmount: booking.totalAmount,
    status: booking.status,
    qrCode: booking.qrCode
  };
};

const validateConfirmRequest = (eventId, seatIds) => {
  if (!isValidObjectId(eventId)) {
    return "Invalid event id.";
  }

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return "seatIds must be a non-empty array.";
  }

  if (seatIds.length > MAX_SEATS_PER_BOOKING) {
    return "You can book a maximum of 6 seats at a time.";
  }

  if (!seatIds.every((seatId) => isValidObjectId(seatId))) {
    return "seatIds must contain only valid seat ids.";
  }

  if (hasDuplicateSeatIds(seatIds)) {
    return "seatIds must not contain duplicate seats.";
  }

  return null;
};

const getValidatedSeats = async (eventId, seatIds, userId, session) => {
  const now = new Date();
  const query = Seat.find({ _id: { $in: seatIds } });

  if (session) {
    query.session(session);
  }

  const seats = await query;

  /*
    Every requested seat must exist, belong to this event, still be held by the
    current user, and have an unexpired hold. If one check fails, we return a
    conflict before creating a booking or changing any seat.
  */
  if (seats.length !== seatIds.length) {
    throw new BookingConflictError("One or more seats are not valid for this booking.");
  }

  const allSeatsAreConfirmable = seats.every((seat) => {
    return (
      idsMatch(seat.event, eventId) &&
      seat.status === "held" &&
      seat.heldBy &&
      idsMatch(seat.heldBy, userId) &&
      seat.holdExpiresAt &&
      seat.holdExpiresAt > now
    );
  });

  if (!allSeatsAreConfirmable) {
    throw new BookingConflictError("One or more seats are no longer held by you.");
  }

  return seats;
};

const updateSeatsForBooking = async (eventId, seatIds, userId, bookingId, session) => {
  const now = new Date();
  const updateOptions = session ? { session } : {};

  /*
    This conditional update is the final concurrency guard. It only books seats
    that are still held by this user and still unexpired at update time.
  */
  const updateResult = await Seat.updateMany(
    {
      _id: { $in: seatIds },
      event: eventId,
      status: "held",
      heldBy: userId,
      holdExpiresAt: { $gt: now }
    },
    {
      $set: {
        status: "booked",
        booking: bookingId,
        heldBy: null,
        holdExpiresAt: null
      }
    },
    updateOptions
  );

  if (updateResult.modifiedCount !== seatIds.length) {
    throw new BookingConflictError("One or more seats are no longer available for booking.");
  }
};

const getExistingEvent = async (eventId, session) => {
  const eventQuery = Event.findById(eventId);

  if (session) {
    eventQuery.session(session);
  }

  const event = await eventQuery;

  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  return event;
};

const createBookingDocument = async (eventId, seatIds, userId, seats, session) => {
  const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);

  const booking = new Booking({
    bookingReference: generateBookingReference(),
    user: userId,
    event: eventId,
    seats: seatIds,
    totalAmount,
    status: "confirmed"
  });

  booking.qrCode = await buildQrCode(booking, eventId, userId);
  await booking.save(session ? { session } : {});

  return booking;
};

const createConfirmedBooking = async (eventId, seatIds, userId, session) => {
  await getExistingEvent(eventId, session);

  const seats = await getValidatedSeats(eventId, seatIds, userId, session);
  const booking = await createBookingDocument(
    eventId,
    seatIds,
    userId,
    seats,
    session
  );

  await updateSeatsForBooking(eventId, seatIds, userId, booking._id, session);

  return booking;
};

const isTransactionUnsupportedError = (error) => {
  const message = error.message || "";

  return (
    message.includes("Transaction numbers are only allowed") ||
    message.includes("transactions are not supported") ||
    message.includes("TransactionNotSupported")
  );
};

const confirmBookingWithTransaction = async (eventId, seatIds, userId) => {
  const session = await mongoose.startSession();
  let booking;

  try {
    /*
      A transaction keeps booking creation and seat updates together. If any
      seat update fails, MongoDB rolls back the booking automatically.
    */
    await session.withTransaction(async () => {
      booking = await createConfirmedBooking(eventId, seatIds, userId, session);
    });

    return booking;
  } finally {
    session.endSession();
  }
};

const confirmBookingWithoutTransaction = async (eventId, seatIds, userId) => {
  let booking = null;
  let seatsBeforeUpdate = [];

  try {
    /*
      Some local MongoDB setups run as a standalone server and cannot use
      transactions. This fallback validates first, then cleans up the booking
      and restores any seats changed by this attempt if the final update fails.
    */
    await getExistingEvent(eventId);
    seatsBeforeUpdate = await getValidatedSeats(eventId, seatIds, userId);
    booking = await createBookingDocument(
      eventId,
      seatIds,
      userId,
      seatsBeforeUpdate
    );

    await updateSeatsForBooking(eventId, seatIds, userId, booking._id);

    return booking;
  } catch (error) {
    if (booking) {
      await Booking.deleteOne({ _id: booking._id });

      const restoreOperations = seatsBeforeUpdate.map((seat) => ({
        updateOne: {
          filter: {
            _id: seat._id,
            booking: booking._id
          },
          update: {
            $set: {
              status: "held",
              heldBy: userId,
              holdExpiresAt: seat.holdExpiresAt,
              booking: null
            }
          }
        }
      }));

      if (restoreOperations.length > 0) {
        await Seat.bulkWrite(restoreOperations);
      }
    }

    throw error;
  }
};

router.post("/confirm", authenticateToken, async (req, res) => {
  try {
    const { eventId, seatIds } = req.body;
    const userId = req.user.userId;
    const validationError = validateConfirmRequest(eventId, seatIds);

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    let booking;

    try {
      booking = await confirmBookingWithTransaction(eventId, seatIds, userId);
    } catch (error) {
      if (error instanceof BookingConflictError) {
        return res.status(409).json({
          message: error.message
        });
      }

      if (error.statusCode === 404) {
        return res.status(404).json({
          message: error.message
        });
      }

      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }

      booking = await confirmBookingWithoutTransaction(eventId, seatIds, userId);
    }

    return res.status(201).json({
      message: "Booking confirmed successfully",
      booking: formatBookingResponse(booking)
    });
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return res.status(409).json({
        message: error.message
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Something went wrong while confirming the booking."
    });
  }
});

router.get("/my-bookings", authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .populate("event", "title venue date time")
      .populate("seats", "seatNumber category price");

    return res.status(200).json({
      bookings
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while getting your bookings."
    });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid booking id."
      });
    }

    const booking = await Booking.findById(id)
      .populate("event", "title venue date time")
      .populate("seats", "seatNumber category price");

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found."
      });
    }

    const isOwner = idsMatch(booking.user, req.user.userId);
    const canAccessAnyBooking = ["organiser", "admin"].includes(req.user.role);

    if (!isOwner && !canAccessAnyBooking) {
      return res.status(403).json({
        message: "You do not have permission to access this booking."
      });
    }

    return res.status(200).json({
      booking
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while getting the booking."
    });
  }
});

module.exports = router;
