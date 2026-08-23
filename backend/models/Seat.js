const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    seatNumber: {
      type: String,
      required: true
    },
    row: {
      type: String,
      required: true
    },
    column: {
      type: Number,
      required: true
    },
    category: {
      type: String,
      enum: ["Premium", "Standard"],
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["available", "held", "booked"],
      default: "available"
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    holdExpiresAt: {
      type: Date,
      default: null
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    }
  },
  {
    timestamps: true
  }
);

seatSchema.index({ event: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model("Seat", seatSchema);
