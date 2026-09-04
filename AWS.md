# AWS Cloud Deployment & Architecture

## Overview

The Ticket Booking System is designed as a full-stack web application that can be deployed using AWS cloud infrastructure.

The application consists of a React/Vite frontend, a Node.js/Express backend, and a MongoDB database. The AWS deployment architecture separates the frontend, backend, and data layers to provide scalability, security, and maintainability.

> **Current status:** AWS deployment is currently in progress. The repository documents the intended cloud architecture and deployment approach; the application should not be considered fully production-deployed on AWS yet.

## Proposed AWS Architecture

```text
                    ┌─────────────────────┐
                    │       Users         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Frontend Hosting   │
                    │       AWS S3        │
                    │   Static React App  │
                    └──────────┬──────────┘
                               │
                               │ HTTPS / REST API
                               ▼
                    ┌─────────────────────┐
                    │   Backend Server    │
                    │      AWS EC2        │
                    │ Node.js + Express   │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌─────────────────┐          ┌─────────────────┐
       │ Managed Database │          │ AWS Services    │
       │ MongoDB / Atlas  │          │ as required     │
       └─────────────────┘          └─────────────────┘
```

## AWS Services

### 1. Amazon EC2

The Node.js/Express backend can be hosted on an Amazon EC2 instance.

Responsibilities:

* Run the backend server
* Host the REST API
* Handle client requests
* Connect to the database
* Provide a scalable compute layer for the application

### 2. Amazon S3

The production React frontend can be built using:

```bash
npm run build
```

The generated static files can then be hosted using Amazon S3.

Responsibilities:

* Host static frontend assets
* Serve the production React application
* Provide highly available object storage

### 3. AWS IAM

IAM can be used to control access to AWS resources.

The deployment follows the principle of least privilege by assigning only the permissions required for each service or deployment operation.

### 4. AWS Security Groups

Security Groups can be configured to control network access to the EC2 instance.

Example:

```text
HTTP   → Port 80
HTTPS  → Port 443
SSH    → Port 22
API    → Application-specific port
```

In a production environment, unnecessary public ports should remain closed.

## Environment Configuration

Sensitive configuration should be stored outside the source code.

Example:

```env
PORT=5000
MONGO_URI=<database-connection-string>
JWT_SECRET=<secret>
```

Actual credentials should never be committed to GitHub.

For production AWS deployment, sensitive configuration can be migrated to appropriate AWS-managed secret/configuration services.

## Deployment Workflow

### Frontend

```text
React Source Code
       ↓
npm install
       ↓
npm run build
       ↓
Production build
       ↓
Amazon S3
```

### Backend

```text
Node.js / Express Application
       ↓
npm install
       ↓
Configure environment variables
       ↓
Deploy to EC2
       ↓
Run backend server
       ↓
Expose REST APIs
```

## 🔄 Application Flow

```text
User
  ↓
React Frontend
  ↓
REST API
  ↓
Node.js / Express Backend
  ↓
Authentication / Business Logic
  ↓
Database
  ↓
Booking Confirmation
  ↓
QR Ticket + Email Notification
```

## 📈 Scalability Considerations

The architecture can be extended for production workloads through:

* EC2 Auto Scaling
* Application Load Balancer
* CloudWatch monitoring and logging
* CDN integration for frontend assets
* Managed database infrastructure
* Secure secret management
* CI/CD through GitHub Actions and AWS deployment workflows

## 🔒 Security Considerations

The production deployment should include:

* HTTPS/TLS
* Restricted Security Group rules
* IAM least-privilege policies
* Secure environment variables
* Database access restrictions
* Authentication and authorization
* Input validation
* Protection of API credentials and secrets
* Logging and monitoring

## 📌 Deployment Status

| AWS Component             | Status         |
| ------------------------- | -------------- |
| AWS architecture planning | ✅ Completed    |
| Cloud deployment design   | ✅ Completed    |
| Backend AWS deployment    | 🚧 In progress |
| Frontend AWS hosting      | 🚧 In progress |
| Production configuration  | 🚧 In progress |
| Production monitoring     | ⏳ Planned      |
| CI/CD automation          | ⏳ Planned      |

## 🎯 Learning Outcomes

This project provides practical exposure to cloud-oriented application architecture, including:

* Designing applications for AWS deployment
* Understanding compute and storage services
* Deploying full-stack applications to cloud infrastructure
* Configuring environment variables
* Managing cloud access using IAM
* Applying network security principles
* Planning scalable application architecture
* Understanding production deployment workflows
