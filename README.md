# Studio Booking Assistant

A comprehensive web application for recording studios to manage bookings, coordinate with staff, and distribute preparation materials to clients.

## Project Overview

The Studio Booking Assistant streamlines the studio booking process, reduces administrative overhead, and enhances the experience for both studio owners and musicians. It provides an intuitive interface for managing studio resources, processing payments, and coordinating with staff and clients.

## Features

### Core Booking Features
- Real-time calendar management with availability tracking
- Customizable session reservation system
- Multi-room and equipment management
- Automated notifications and reminders

### Financial Management
- Secure online payment processing
- Automated invoicing and receipt generation
- Dynamic pricing based on time, equipment, and staff

### User Management
- Studio staff coordination and scheduling
- Client profile management
- Review and rating system

### Additional Features
- Preparation materials distribution
- Integration with accounting software and calendar systems
- Analytics dashboard for business insights

## Technology Stack

### Front-end
- React.js
- Material-UI
- Redux for state management
- React Big Calendar for scheduling

### Back-end
- Node.js with Express
- RESTful API with JWT authentication
- PostgreSQL database
- Redis for caching

### Cloud Services
- AWS (EC2, S3, Lambda)
- SendGrid for email notifications
- Stripe for payment processing
- Google Calendar API for synchronization

## System Architecture

The application follows a microservices architecture with the following components:

1. **Client Layer**: Web application with mobile-responsive design
2. **API Gateway**: Routes requests, handles authentication, and implements rate limiting
3. **Microservices**:
   - Booking Service
   - User Service
   - Payment Service
   - Notification Service
   - Resource Service
4. **Data Layer**: PostgreSQL, Redis, S3
5. **External Integrations**: Payment gateways, email services, calendar systems

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL (v13 or higher)
- Redis
- AWS account
- Stripe account
- SendGrid account

### Local Development Setup

1. **Clone the repository**
   ```
   git clone https://github.com/dxaginfo/studio-booking-assistant.git
   cd studio-booking-assistant
   ```

2. **Install dependencies**
   ```
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. **Set up environment variables**
   ```
   # Create .env files in both server and client directories
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
   Edit the .env files with your database credentials, API keys, and other configuration settings.

4. **Set up the database**
   ```
   # Run database migrations
   cd server
   npm run migrate
   
   # Optional: Seed the database with sample data
   npm run seed
   ```

5. **Start the development servers**
   ```
   # Start the backend server
   cd server
   npm run dev
   
   # In a separate terminal, start the frontend server
   cd client
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to http://localhost:3000

### Production Deployment

1. **Build the frontend**
   ```
   cd client
   npm run build
   ```

2. **Set up production environment**
   - Configure your production server (AWS EC2 or similar)
   - Set up a production database
   - Configure environment variables for production

3. **Deploy using Docker (recommended)**
   ```
   docker-compose up -d
   ```

4. **Alternative deployment options**
   - Deploy frontend to AWS S3 with CloudFront
   - Deploy backend to AWS ECS or Kubernetes
   - Set up CI/CD with GitHub Actions

## Security Considerations

- HTTPS for all communications
- JWT with proper expiration for authentication
- Encryption for sensitive data
- Role-based access control
- PCI compliance for payment processing
- Regular security audits

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please open an issue on GitHub or contact the development team.