const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const {
  authenticateToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

const allowedEventTypes = ["movie", "concert"];

router.get("/", async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ date: 1 })
      .populate("organiser", "name email");

    return res.status(200).json({
      events
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while getting events."
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event id."
      });
    }

    const event = await Event.findById(id).populate("organiser", "name email");

    if (!event) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    return res.status(200).json({
      event
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while getting the event."
    });
  }
});

router.post(
  "/",
  authenticateToken,
  authorizeRoles("organiser", "admin"),
  async (req, res) => {
    try {
      const {
        title,
        type,
        description,
        venue,
        date,
        time,
        image
      } = req.body;

      if (!title || !type || !venue || !date || !time) {
        return res.status(400).json({
          message: "Title, type, venue, date, and time are required."
        });
      }

      if (!allowedEventTypes.includes(type)) {
        return res.status(400).json({
          message: "Type must be movie or concert."
        });
      }

      const event = await Event.create({
        title,
        type,
        description,
        venue,
        date,
        time,
        image,
        organiser: req.user.userId
      });

      return res.status(201).json({
        message: "Event created successfully.",
        event
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong while creating the event."
      });
    }
  }
);

module.exports = router;
