require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Event = require("./models/Event");
const Seat = require("./models/Seat");
const Booking = require("./models/Booking");
const Waitlist = require("./models/Waitlist");

const getFutureDate = (daysFromToday) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildSeatsForEvent = (eventId) => {
  const seats = [];
  const rows = ["A", "B", "C", "D", "E"];

  rows.forEach((row) => {
    const isPremium = row === "A" || row === "B";
    const category = isPremium ? "Premium" : "Standard";
    const price = isPremium ? 500 : 250;

    for (let column = 1; column <= 6; column += 1) {
      seats.push({
        event: eventId,
        seatNumber: `${row}${column}`,
        row,
        column,
        category,
        price,
        status: "available"
      });
    }
  });

  return seats;
};

const seedDatabase = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for seeding.");

    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Seat.deleteMany({}),
      Booking.deleteMany({}),
      Waitlist.deleteMany({})
    ]);
    console.log("Existing users, events, seats, bookings, and waitlists cleared.");

    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    const hashedOrganiserPassword = await bcrypt.hash("organiser123", 10);
    const hashedCustomerPassword = await bcrypt.hash("customer123", 10);

    const users = await User.insertMany([
      {
        name: "Admin User",
        email: "admin@ticketbook.com",
        password: hashedAdminPassword,
        role: "admin"
      },
      {
        name: "Event Organiser",
        email: "organiser@ticketbook.com",
        password: hashedOrganiserPassword,
        role: "organiser"
      },
      {
        name: "Demo Customer",
        email: "customer@ticketbook.com",
        password: hashedCustomerPassword,
        role: "customer"
      }
    ]);

    const organiser = users.find((user) => user.role === "organiser");

    const events = await Event.insertMany([
      {
        title: "Interstellar Re-Release",
        type: "movie",
        venue: "VIT Auditorium",
        description: "Special screening of Interstellar",
        date: getFutureDate(7),
        time: "18:00",
        organiser: organiser._id
      },
      {
        title: "AR Rahman Live",
        type: "concert",
        venue: "VIT Open Air Theatre",
        description: "Live music concert",
        date: getFutureDate(14),
        time: "19:30",
        organiser: organiser._id
      }
    ]);

    const seatsToCreate = events.flatMap((event) => buildSeatsForEvent(event._id));
    const seats = await Seat.insertMany(seatsToCreate);

    console.log("Seed completed successfully.");
    console.log(`Users created: ${users.length}`);
    console.log(`Events created: ${events.length}`);
    console.log(`Seats created: ${seats.length}`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

seedDatabase();
