# Amdan Organics Integrated Enterprise Management and E-Commerce System

A Node.js + Express REST API project for managing organic farm operations, inventory, marketplace listings, and e-commerce with role-based authentication.

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Tech Stack](#tech-stack)
6. [API Endpoints](#api-endpoints)
7. [License](#license)
8. [Conclusion](#conclusion)

---

## Introduction

The **Amdan Organics Integrated Enterprise Management and E-Commerce System** is a full-stack Node.js-based project that allows farm owners, staff, buyers, and administrators to collaboratively manage organic farming operations and trade.

It provides a clean web interface along with REST API endpoints, making it easy to integrate with other applications. This project was built to demonstrate backend development skills, JWT authentication, role-based access control, and CRUD functionality across multiple farm and commerce modules.

---

## Features

- User registration and authentication (JWT)
- Role-based access control (Admin, Farm Owner, Staff, Buyer)
- Crop plan management (Create, Read, Update, Delete)
- Field activity logging and task tracking
- Harvest recording and tracking
- Inventory management with stock control
- Real-time weather data integration (OpenWeatherMap API)
- Agronomic advisory management
- Market price monitoring
- Marketplace listings with approval workflow
- Buyer inquiries and order management
- Report generation and CSV export
- Admin dashboard with system logs and user management
- Token-based authentication with 7-day expiry

---

## Installation

Clone the repository:

```
git clone https://github.com/<your-username>/amdan-organics-system.git
cd amdan-organics-system
```

Install dependencies:

```
npm install
```

Set up environment variables by creating a `.env` file in the root directory:

```
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydatabase
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

OPENWEATHER_API_KEY=your_openweather_api_key
FARM_LATITUDE=9.0192
FARM_LONGITUDE=38.7525

NODE_ENV=development
```

Run database migrations (ensure PostgreSQL is running):

```
psql -U postgres -d mydatabase -f db/schema.sql
```

Start the development server:

```
npm run dev
```

Or start in production:

```
npm start
```

Open:

```
http://localhost:3000/
```

---

## Usage

- Register a new account as a Farm Owner, Staff, or Buyer
- Log in to receive your JWT token
- Farm Owners and Staff can manage crop plans, field activities, harvests, inventory, and advisories
- Buyers can browse the marketplace, submit inquiries, and place orders
- Admins can manage all users, approve listings, view system logs, and generate reports
-  Farm Manager = "email": "manager@amdan.com"
             password = manager123
- Staff   =  "email": "staff@amdan.com"
             password = staff123
                   
- System Admin  =  "email": "admin@amdan.com"
        password = admin123
    
- the buyer must be Registerd 
                  
---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (via `pg`)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **File Uploads:** Multer
- **Weather Integration:** OpenWeatherMap API (via Axios)
- **Export:** JSON to CSV (`json2csv`)
- **Frontend:** HTML, CSS, Vanilla JavaScript (served as static files)
- **Dev Tools:** Nodemon, dotenv

---

## API Endpoints

| Module          | Base Route          |
|-----------------|---------------------|
| Authentication  | `/api/auth`         |
| Crop Plans      | `/api/cropplans`    |
| Field Activities| `/api/activities`   |
| Harvests        | `/api/harvests`     |
| Inventory       | `/api/inventory`    |
| Weather         | `/api/weather`      |
| Advisories      | `/api/advisories`   |
| Market Prices   | `/api/prices`       |
| Listings        | `/api/listings`     |
| Inquiries       | `/api/inquiries`    |
| Orders          | `/api/orders`       |
| Reports         | `/api/reports`      |
| Admin           | `/api/admin`        |

---

## License

MIT License – feel free to use and modify.

---

## Conclusion

This project demonstrates Node.js + Express + PostgreSQL for building a real-world, role-based enterprise API with authentication, CRUD functionality, external API integration, and a multi-role frontend.
It serves as a foundation for more complex agri-tech applications such as supply chain platforms or cooperative farm management systems.
