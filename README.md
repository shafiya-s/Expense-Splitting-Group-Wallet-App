# Expense Splitting & Group Wallet App

A full-stack web application designed for friends, roommates, and travel groups to effortlessly track shared expenses, calculate net balances, manage friendships, and record debt settlements.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (Spring Boot)](#backend-setup-spring-boot)
  - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
- [Environment Configuration](#environment-configuration)
- [Cloud Deployment](#cloud-deployment)
  - [Docker & Render (Backend)](#docker--render-backend)
  - [Vercel (Frontend)](#vercel-frontend)
- [Future Improvements](#future-improvements)

---

## Overview

Sharing expenses among roommates, colleagues, or travel groups often leads to messy spreadsheets, forgotten balances, and awkward conversations about money. **Expense Splitting & Group Wallet App** eliminates this friction with:
- Transparent group management and real-time expense tracking.
- Equal and custom split calculation mechanisms.
- Simplified net balance computation (*who owes whom*).
- An overview Dashboard with personal financial status across all joined groups.

---

## Key Features

- **Personal Dashboard**: High-level summary of your net financial state (*You should receive*, *You need to pay*, and *You paid*), compact group overviews, and recent activity previews.
- **Group Management**: Create groups with custom descriptions, add members by email or directly from your friends list, and view group-specific balances.
- **Flexible Expense Splitting**:
  - **Equal Split**: Evenly distributes the total expense among all selected participants.
  - **Custom Split**: Custom share allocations with exact amount validation.
- **Simplified Balances & Settlements**: Automatically computes debts between members and allows users to record external debt settlements with zero-out tracking.
- **Friend System**: Search registered users, send and receive friend requests, and quickly add friends into new or existing groups.
- **User Profile Management**: Update personal profile details and securely manage account settings.
- **Secure Authentication**: Stateless JWT authentication with encrypted password storage (BCrypt).

---

## Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Routing**: React Router DOM (v7)
- **Styling**: Tailwind CSS with custom warm aesthetic theme tokens
- **HTTP Client**: Axios with request/response interceptors

### Backend
- **Framework**: Spring Boot
- **Language**: Java 17
- **Security**: Spring Security 6 with JWT (`jjwt`) & BCrypt
- **ORM & Persistence**: Spring Data JPA / Hibernate
- **Build Tool**: Maven (`mvn` / `mvnw`)

### Database
- **RDBMS**: MySQL 8.x

---

## Project Structure

```text
Expense-Splitting-Group-Wallet-App/
├── backend/
│   └── expensesplitter/
│       ├── src/main/java/com/college/expensesplitter/
│       │   ├── controller/      # REST API Controllers (Auth, Group, Expense, Friend, User, Settlement)
│       │   ├── dto/             # Data Transfer Objects & Requests/Responses
│       │   ├── model/entity/    # JPA Entities (User, Group, Expense, ExpenseSplit, Settlement, FriendRequest)
│       │   ├── repository/      # Spring Data JPA Repositories
│       │   ├── security/        # JWT Authentication Filter, Service & Security Configuration
│       │   └── service/         # Core business logic & balance calculations
│       ├── src/main/resources/
│       │   └── application.properties # Spring configuration & environment mappings
│       ├── Dockerfile           # Multi-stage Dockerfile for containerized deployment
│       ├── pom.xml              # Maven dependencies & build definitions
│       └── .env.example         # Backend environment variables template
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios client instance with JWT interceptor
│   │   ├── components/          # Reusable UI & layout components (AppLayout, AuthLayout)
│   │   ├── context/             # React AuthContext for state persistence
│   │   ├── pages/               # Page views (Dashboard, GroupDetail, Groups, Friends, Login, Signup, Profile, Settings)
│   │   ├── App.jsx              # Application routing configuration
│   │   └── index.css            # Global CSS & theme tokens
│   ├── package.json             # NPM dependencies & scripts
│   ├── vite.config.js           # Vite build configuration
│   └── .env.example             # Frontend environment variables template
├── Problem_Statement.md         # Domain specifications and requirements
└── README.md                    # Project documentation
```

---

## Database Schema

The core domain model includes 6 primary entity tables:

1. **`users`**: `id`, `name`, `email`, `phone`, `password_hash`, `created_at`
2. **`groups`**: `id`, `name`, `description`, `created_by` (FK -> `users`), `created_at`
3. **`group_members`**: `id`, `group_id` (FK -> `groups`), `user_id` (FK -> `users`), `role_in_group`, `joined_at`
4. **`expenses`**: `id`, `group_id` (FK -> `groups`), `paid_by` (FK -> `users`), `amount`, `description`, `split_type`, `created_at`
5. **`expense_splits`**: `id`, `expense_id` (FK -> `expenses`), `user_id` (FK -> `users`), `share_amount`, `is_settled`
6. **`settlements`**: `id`, `group_id` (FK -> `groups`), `paid_by` (FK -> `users`), `paid_to` (FK -> `users`), `amount`, `settled_on`
7. **`friend_requests`**: `id`, `sender_id` (FK -> `users`), `receiver_id` (FK -> `users`), `status`, `created_at`

---

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` — Register a new account
- `POST /api/v1/auth/login` — Login and receive JWT access token

### User Profile & Search
- `GET /api/v1/users/profile` — Get profile for authenticated user
- `PUT /api/v1/users/profile` — Update user profile information
- `GET /api/v1/users/search?q={query}` — Search users by name or email

### Friends Management
- `GET /api/v1/friends` — List accepted friends
- `GET /api/v1/friends/requests` — List pending friend requests
- `POST /api/v1/friends/request` — Send a friend request to a user ID
- `PUT /api/v1/friends/requests/{id}/accept` — Accept friend request
- `PUT /api/v1/friends/requests/{id}/reject` — Reject friend request

### Groups
- `POST /api/v1/groups` — Create a new group
- `GET /api/v1/groups` — List all groups for the authenticated user (includes `userNetBalance`)
- `GET /api/v1/groups/{id}/members` — List members in a group
- `POST /api/v1/groups/{id}/members` — Add a member to a group by email

### Expenses & Balances
- `POST /api/v1/groups/{groupId}/expenses` — Create a group expense with equal or custom split
- `GET /api/v1/groups/{groupId}/expenses` — List all expenses in a group
- `PUT /api/v1/groups/{groupId}/expenses/{expenseId}` — Update an existing expense
- `DELETE /api/v1/groups/{groupId}/expenses/{expenseId}` — Delete an expense
- `GET /api/v1/groups/{groupId}/expenses/balances` — Retrieve computed member debt balance breakdown

### Settlements
- `POST /api/v1/groups/{groupId}/settlements` — Record an external payment between two members

---

## Getting Started

### Prerequisites
- **Java**: JDK 17 or higher
- **Node.js**: v18 or higher (with npm)
- **MySQL Server**: 8.x running locally or remotely

---

### Backend Setup (Spring Boot)

1. Navigate to the backend folder:
   ```bash
   cd backend/expensesplitter
   ```

2. Create a MySQL database for the application:
   ```sql
   CREATE DATABASE expensesplitter;
   ```

3. Create your local `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   Configure your database credentials in `.env`:
   ```env
   DB_URL=jdbc:mysql://localhost:3306/expensesplitter?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
   DB_USERNAME=root
   DB_PASSWORD=your_mysql_password
   PORT=8080
   JWT_SECRET=your_jwt_secret_key_minimum_256_bits_length
   JWT_EXPIRATION_MS=86400000
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   ```

4. Build and run the backend:
   ```bash
   ./mvnw spring-boot:run
   ```
   *(On Windows, run `mvnw.cmd spring-boot:run`)*

---

### Frontend Setup (React + Vite)

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your local `.env` file:
   ```bash
   cp .env.example .env
   ```
   Set the API URL:
   ```env
   VITE_API_URL=http://localhost:8080/api/v1
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Configuration

### Backend Variables

| Variable | Description | Default / Example |
|---|---|---|
| `DB_URL` | JDBC Connection URL | `jdbc:mysql://localhost:3306/expensesplitter` |
| `DB_USERNAME` | MySQL Username | `root` |
| `DB_PASSWORD` | MySQL Password | `your_password` |
| `PORT` | Application server port | `8080` |
| `JWT_SECRET` | Secret key for signing JWTs | `base64_or_plain_secret_string` |
| `JWT_EXPIRATION_MS` | Token expiry duration in ms | `86400000` (24 hours) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173` |

### Frontend Variables

| Variable | Description | Default / Example |
|---|---|---|
| `VITE_API_URL` | Base URL for REST API endpoints | `http://localhost:8080/api/v1` |

---

## Cloud Deployment

### Docker & Render (Backend)

The backend includes a multi-stage `Dockerfile` optimized for container platforms such as **Render**:

1. **Build Step**: Packages the jar via `maven:3.9.6-eclipse-temurin-17`.
2. **Runtime Step**: Runs on `eclipse-temurin:17-jre-alpine` as a non-privileged `appuser`.
3. **Environment Setup**: Define `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, and Render automatically injects `PORT`.

### Vercel (Frontend)

1. Deploy the `frontend/` directory to **Vercel**.
2. Add the environment variable in the Vercel dashboard:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com/api/v1`

---

## Future Improvements

- Multi-currency support and real-time exchange rates.
- Bill receipt image upload with OCR parsing.
- Recurring automated group expenses (e.g., monthly rent, utilities).
- Export expense reports and settlement summaries to PDF / CSV.
- Email or push notifications for new expenses and pending settlements.
