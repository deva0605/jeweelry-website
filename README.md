# Ushhh.atelier — Jewellery Store
A minimal, editorial jewellery e-commerce website built with **React + Vite** (frontend) and **Express + SQLite** (backend).

---

## Project Structure

```
jewellry website/
├── client/          # React + Vite frontend
└── server/          # Express auth backend
```

---

## Features

- **Product catalogue** — filterable grid with blurred-backdrop image cards
- **Product detail pages** — routed via React Router
- **Shopping cart** — slide-in drawer with quantity controls and live total
- **Dark mode** — real-time toggle stored in state
- **Authentication** — Sign Up / Sign In with secure JWT (httpOnly cookies)

## Security
- JWT stored in `httpOnly`, `Secure`, `SameSite=Strict` cookie — never accessible to JavaScript
- Passwords hashed with **bcrypt** (12 rounds)
- Rate limiting: 10 req / 15 min on all auth routes; 5 req / 15 min on login
- Account lockout after 5 failed login attempts (30 min)
- All DB queries use **parameterised statements** (no SQL injection surface)
- Input validated and sanitised on both frontend and backend

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/jewellry-website.git
cd jewellry-website
```

### 2. Set up the backend

```bash
cd server
npm install
cp .env.example .env        # Fill in your secrets
npm run dev                  # Starts on http://localhost:3001
```

### 3. Set up the frontend

```bash
cd client
npm install
cp .env.example .env        # Set VITE_API_URL if needed
npm run dev                  # Starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3001) |
| `JWT_SECRET` | Min 64-char random hex string |
| `COOKIE_SECRET` | Random hex string for cookie signing |
| `BCRYPT_ROUNDS` | bcrypt work factor (12 recommended) |
| `ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |
| `MAX_LOGIN_ATTEMPTS` | Lockout threshold (default: 5) |
| `LOCK_DURATION_MINUTES` | Lockout duration (default: 30) |

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (default: http://localhost:3001) |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, React Router 6 |
| Backend | Express 4.22, better-sqlite3 13 |
| Auth | bcryptjs, jsonwebtoken (httpOnly cookie) |
| Security | Helmet, express-rate-limit, express-validator, CORS |

