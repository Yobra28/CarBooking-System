# Car Rental Platform

A full-stack car rental management system with a modern Angular frontend and a robust NestJS backend using Prisma ORM and PostgreSQL.

## Features

- User authentication (JWT, roles: Admin, Agent, Customer)
- Vehicle management (CRUD, image upload via Cloudinary)
- Booking system with admin/agent/customer dashboards
- Review and rating system for vehicles
- Contact form and email notifications
- Password reset functionality
- Responsive, modern Angular UI

## Tech Stack

- **Frontend:** Angular, Tailwind CSS
- **Backend:** NestJS, Prisma ORM
- **Database:** PostgreSQL
- **Other:** Cloudinary (image upload), Nodemailer (email)

---

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- PostgreSQL database

### Clone the Repository
```bash
git clone <your-repo-url>
cd Car\ Rental
```

---

## Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment:**
   - Create a `.env` file in `backend/` with your database and JWT settings.
   - Example:
     ```env
     DATABASE_URL=postgresql://user:password@localhost:5432/car_rental
     JWT_SECRET=your_jwt_secret
     JWT_EXPIRES_IN=1d
     CLOUDINARY_CLOUD_NAME=your_cloud_name
     CLOUDINARY_API_KEY=your_api_key
     CLOUDINARY_API_SECRET=your_api_secret
     EMAIL_USER=your_email@example.com
     EMAIL_PASS=your_email_password
     ```

3. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   # or for development
   npx prisma migrate dev
   ```

4. **Start the backend server:**
   ```bash
   npm run start:dev
   ```
   The backend will run on `http://localhost:3000` by default.

---

## Frontend Setup

1. **Install dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

2. **Configure API URL:**
   - Edit `src/environments/environment.ts` and `environment.prod.ts` to set your backend API URL if needed.

3. **Start the frontend server:**
   ```bash
   npm start
   # or
   ng serve
   ```
   The frontend will run on `http://localhost:4200` by default.

---

## Usage

- Register as a customer, agent, or admin.
- Admins/agents can manage vehicles and bookings.
- Customers can browse, book, and review vehicles.
- Password reset and contact forms are available.

---

## Project Structure

```
Car Rental/
  backend/    # NestJS API, Prisma, migrations
  frontend/   # Angular app, components, services
```

---

## Scripts

### Backend
- `npm run start:dev` — Start backend in development mode
- `npx prisma migrate dev` — Run migrations
- `npx prisma studio` — Open Prisma Studio (DB GUI)

### Frontend
- `npm start` or `ng serve` — Start Angular dev server

---

## License

MIT 