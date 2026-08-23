const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    category: {
      type: String,
      enum: ["Premium", "Standard"],
      required: true
    },
    status: {
      type: String,
      enum: ["waiting", "offered", "expired", "completed"],
      default: "waiting"
    },
    offeredSeat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      default: null
    },
    offerExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Waitlist", waitlistSchema);
