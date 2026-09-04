# Ticket Booking System

A full-stack ticket booking platform for **movies and concerts**, designed to provide a seamless booking experience with visual seat selection, temporary seat holds, automated waitlisting, QR-code tickets, and email notifications.

## Features

* Browse and manage movie/concert events
* Interactive visual seat selection
* Temporary seat locking during checkout
* Automatic release of held seats when checkout is abandoned
* Waitlist management for sold-out events
* Automatic seat assignment to eligible waitlisted users after cancellation
* Booking confirmation with QR-code ticket generation
* Email notifications for confirmed bookings
* Authentication and protected backend routes
* Database-backed event, seat, user, and booking management
* RESTful backend APIs
* Responsive web interface

## Architecture

The application follows a client-server architecture:

```text
┌─────────────────────────────┐
│        React Frontend       │
│        Vite + React         │
└──────────────┬──────────────┘
               │ REST API
               ▼
┌─────────────────────────────┐
│       Node.js Backend       │
│      Express REST APIs      │
│                             │
│  Routes │ Middleware │ Models│
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Database           │
│   Users │ Events │ Seats    │
│   Bookings │ Waitlist       │
└─────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* JavaScript
* HTML5
* CSS3

### Backend

* Node.js
* Express.js
* REST APIs
* Middleware-based request handling

### Database

* MongoDB

### Development & Tools

* Git
* GitHub
* npm
* Environment variables

### Cloud / AWS

The project is being prepared for cloud deployment using AWS. The intended cloud architecture and deployment considerations are documented separately in [`AWS.md`](AWS.md).

> **Deployment status:** The application is currently developed and tested locally. Full production deployment to AWS is in progress.

## Project Structure

```text
ticket-booking-system/
│
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── .env
│   ├── package.json
│   ├── seed.js
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── index.html
│   └── vite.config.js
│
├── AWS.md
└── README.md
```

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/PoojaSenthilkumar-cmd/ticket-booking-system.git
cd ticket-booking-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file containing the required environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Start the backend:

```bash
npm start
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend can then be accessed through the local Vite development server.

## Security

The project uses environment variables for configuration and sensitive credentials.

**Never commit actual credentials, API keys, database passwords, or secrets to the repository.**

## AWS Deployment

The application is designed with cloud deployment in mind. The AWS deployment plan includes:

* Compute infrastructure for the backend
* Cloud-hosted frontend
* Managed database connectivity
* Secure environment-variable configuration
* Network and access control
* Production-oriented deployment architecture

See [`AWS.md`](AWS.md) for the detailed AWS architecture and deployment plan.

## Current Status

| Component              | Status         |
| ---------------------- | -------------- |
| Frontend               | ✅ Implemented  |
| Backend REST APIs      | ✅ Implemented  |
| Database integration   | ✅ Implemented  |
| Authentication         | ✅ Implemented  |
| Seat booking workflow  | ✅ Implemented  |
| Waitlist functionality | ✅ Implemented  |
| QR-code tickets        | ✅ Implemented  |
| Email notifications    | ✅ Implemented  |
| AWS deployment         | 🚧 In progress |

## Future Improvements

* Production AWS deployment
* CI/CD pipeline using GitHub Actions
* HTTPS with a custom domain
* Containerization using Docker
* Automated monitoring and logging
* Horizontal scaling for high booking traffic
* Cloud-based caching and performance optimization

## Author

**Pooja Senthilkumar**
