const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Seat = require("../models/Seat");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();
const MAX_SEATS_PER_HOLD = 6;
const HOLD_DURATION_MINUTES = 5;

const releaseExpiredHolds = async (eventId) => {
  const now = new Date();

  await Seat.updateMany(
    {
      event: eventId,
      status: "held",
      holdExpiresAt: { $lte: now }
    },
    {
      $set: {
        status: "available",
        heldBy: null,
        holdExpiresAt: null
      }
    }
  );
};

const hasDuplicateSeatIds = (seatIds) => {
  const uniqueSeatIds = new Set(seatIds.map((seatId) => String(seatId)));
  return uniqueSeatIds.size !== seatIds.length;
};

const validateSeatIds = (seatIds) => {
  return (
    Array.isArray(seatIds) &&
    seatIds.length > 0 &&
    seatIds.every((seatId) => mongoose.Types.ObjectId.isValid(seatId))
  );
};

router.get("/:eventId/seats", async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        message: "Invalid event id."
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    await releaseExpiredHolds(eventId);

    const seats = await Seat.find({ event: eventId }).sort({
      row: 1,
      column: 1
    });

    return res.status(200).json({
      seats
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while getting seats."
    });
  }
});

router.post("/:eventId/seats/hold", authenticateToken, async (req, res) => {
  const heldSeatIds = [];
  let rollbackEventId = null;
  let rollbackHoldExpiresAt = null;

  try {
    const { eventId } = req.params;
    const { seatIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        message: "Invalid event id."
      });
    }

    if (!validateSeatIds(seatIds)) {
      return res.status(400).json({
        message: "seatIds must be a non-empty array of valid seat ids."
      });
    }

    if (hasDuplicateSeatIds(seatIds)) {
      return res.status(400).json({
        message: "seatIds must not contain duplicate seats."
      });
    }

    if (seatIds.length > MAX_SEATS_PER_HOLD) {
      return res.status(400).json({
        message: "You can hold a maximum of 6 seats at a time."
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    await releaseExpiredHolds(eventId);

    const availableSeatCount = await Seat.countDocuments({
      _id: { $in: seatIds },
      event: eventId,
      status: "available"
    });

    if (availableSeatCount !== seatIds.length) {
      return res.status(409).json({
        message: "One or more seats are no longer available."
      });
    }

    const holdExpiresAt = new Date(
      Date.now() + HOLD_DURATION_MINUTES * 60 * 1000
    );
    rollbackEventId = eventId;
    rollbackHoldExpiresAt = holdExpiresAt;

    for (const seatId of seatIds) {
      /*
        This conditional update is the concurrency guard. Even if two users
        request the same seat at the same time, MongoDB only updates it when it
        is still available at the exact moment this update runs.
      */
      const updateResult = await Seat.updateOne(
        {
          _id: seatId,
          event: eventId,
          status: "available"
        },
        {
          $set: {
            status: "held",
            heldBy: req.user.userId,
            holdExpiresAt
          }
        }
      );

      if (updateResult.modifiedCount !== 1) {
        /*
          If any seat fails, only undo the seats changed by this request.
          heldSeatIds contains only seats successfully held in this loop, and
          the filter also checks heldBy plus the same expiration timestamp.
        */
        await Seat.updateMany(
          {
            _id: { $in: heldSeatIds },
            event: eventId,
            status: "held",
            heldBy: req.user.userId,
            holdExpiresAt
          },
          {
            $set: {
              status: "available",
              heldBy: null,
              holdExpiresAt: null
            }
          }
        );

        return res.status(409).json({
          message: "One or more seats are no longer available."
        });
      }

      heldSeatIds.push(seatId);
    }

    const heldSeats = await Seat.find({
      _id: { $in: heldSeatIds },
      event: eventId,
      heldBy: req.user.userId,
      holdExpiresAt
    }).sort({
      row: 1,
      column: 1
    });

    return res.status(200).json({
      message: "Seats held successfully",
      heldSeats,
      holdExpiresAt
    });
  } catch (error) {
    if (heldSeatIds.length > 0) {
      await Seat.updateMany(
        {
          _id: { $in: heldSeatIds },
          event: rollbackEventId,
          status: "held",
          heldBy: req.user.userId,
          holdExpiresAt: rollbackHoldExpiresAt
        },
        {
          $set: {
            status: "available",
            heldBy: null,
            holdExpiresAt: null
          }
        }
      );
    }

    return res.status(500).json({
      message: "Something went wrong while holding seats."
    });
  }
});

router.post("/:eventId/seats/release", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { seatIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        message: "Invalid event id."
      });
    }

    if (!validateSeatIds(seatIds)) {
      return res.status(400).json({
        message: "seatIds must be a non-empty array of valid seat ids."
      });
    }

    const updateResult = await Seat.updateMany(
      {
        _id: { $in: seatIds },
        event: eventId,
        status: "held",
        heldBy: req.user.userId
      },
      {
        $set: {
          status: "available",
          heldBy: null,
          holdExpiresAt: null
        }
      }
    );

    return res.status(200).json({
      message: "Seats released successfully.",
      releasedCount: updateResult.modifiedCount
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while releasing seats."
    });
  }
});

module.exports = router;
