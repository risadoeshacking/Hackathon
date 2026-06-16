# Student Swap — School Marketplace

A private internal marketplace for students at Rosmini College to buy and sell second-hand items.

---

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Python 3.10+ + Flask
- **Database:** PostgreSQL (Supabase / Neon / local)
- **Auth:** JWT + bcrypt, school email domain restriction

---

## Project Structure

```
student-swap/
├── backend/          # Express API
│   ├── src/
│   │   ├── config/   # DB connection
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── scripts/  # Admin creation script
│   └── server.js
├── frontend/         # React + Vite app
│   └── src/
│       ├── api/      # API client modules
│       ├── components/
│       ├── contexts/ # Auth context
│       └── pages/
└── database/
    ├── schema.sql    # All tables + indexes
    └── seed.sql      # Default school + categories
```

---

## Setup Instructions

### 1. Database

Use [Supabase](https://supabase.com) (free tier) or [Neon](https://neon.tech) (free tier) for a hosted PostgreSQL database.

After creating your project, get the connection string and run:

```bash
# Run schema
psql "postgresql://user:pass@host:5432/dbname" -f database/schema.sql

# Run seed data (school + categories)
psql "postgresql://user:pass@host:5432/dbname" -f database/seed.sql
```

Or use the npm scripts (from inside `backend/`):
```bash
DATABASE_URL="postgresql://..." npm run db:setup
```

---

### 2. Backend

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET_KEY=a-very-long-random-secret-string-here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Create an admin user (interactive):
```bash
python scripts/create_admin.py
```

Start the server:
```bash
python app.py
```

API runs at: `http://localhost:3001`

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: `http://localhost:5173`

The Vite dev server proxies `/api` and `/uploads` to `localhost:3001` automatically.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Register (school email only) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/listings` | Browse listings (with filters) |
| POST | `/api/listings` | Create listing |
| GET | `/api/listings/:id` | View listing detail |
| PUT | `/api/listings/:id` | Edit listing |
| POST | `/api/listings/:id/like` | Toggle like |
| POST | `/api/listings/:id/report` | Report listing |
| GET | `/api/recommendations` | Personalized recommendations |
| POST | `/api/orders` | Place an order |
| GET | `/api/orders` | My orders |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/users/profile` | My profile |
| PUT | `/api/users/profile` | Update profile |
| GET | `/api/admin/listings` | Admin: all listings |
| PATCH | `/api/admin/listings/:id/approve` | Admin: approve listing |
| GET | `/api/admin/reports` | Admin: moderation reports |
| PATCH | `/api/admin/reports/:id` | Admin: review report |
| GET | `/api/admin/users` | Admin: manage users |

---

## Recommendation System

Scores are calculated per category based on user behavior history:

| Action | Score |
|--------|-------|
| View | 1 |
| Like | 3 |
| Purchase | 5 |

Categories are ranked by accumulated score. Recommendations show active listings from top-ranked categories, excluding already-interacted items.

---

## Safety System

1. All new listings go through **admin approval** before going public (`status = pending`)
2. Students can **report listings** with a reason
3. Admins can **dismiss** or **action** reports (removing the listing)
4. Admins can **deactivate users** who violate rules

---

## Production Deployment

### Backend (e.g. Railway / Render)
- Set all env vars in the platform dashboard
- Set `NODE_ENV=production`
- Start command: `node server.js`

### Frontend (e.g. Vercel / Netlify)
- Build command: `npm run build`
- Output directory: `dist`
- Set env var `VITE_API_URL` if needed (update `src/api/client.js` baseURL)

---

## Adding Another School

1. Insert the school into the `schools` table:
```sql
INSERT INTO schools (name, email_domain)
VALUES ('School Name', 'school.nz');
```

2. Create an admin for that school via the script or API.

The platform automatically assigns users to their school based on email domain — no code changes needed.
