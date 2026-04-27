# 🎓 SIMS Pro – School Information Management System

> A production-ready, full-stack School Management System built with **NestJS + Next.js 14 + PostgreSQL + Prisma**

---

## 🏗️ Tech Stack

| Layer         | Technology            | Why                                    |
|---------------|-----------------------|----------------------------------------|
| **Backend**   | NestJS (Node.js)      | Enterprise-grade, modular, scalable    |
| **Frontend**  | Next.js 14 (App Router)| SSR, SEO, performance, file-based routing |
| **Database**  | PostgreSQL 16         | Structured relational data, reliable   |
| **ORM**       | Prisma                | Type-safe DB access, auto-migrations   |
| **Auth**      | JWT + Passport.js     | Stateless, role-based access control   |
| **Styling**   | Tailwind CSS          | Utility-first, fast development        |
| **Charts**    | Recharts              | React-native charting library          |
| **Deploy**    | Docker + Nginx        | Consistent, portable deployments       |

---

## 📁 Project Structure

```
sims/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/               # JWT auth + guards + strategies
│   │   ├── students/           # Student CRUD
│   │   ├── teachers/           # Teacher CRUD
│   │   ├── classes/            # Class management
│   │   ├── fees/               # Fee tracking + receipts
│   │   ├── notices/            # Notice board
│   │   ├── homework/           # Homework management
│   │   ├── attendance/         # Attendance tracking
│   │   ├── dashboard/          # Analytics per role
│   │   ├── prisma/             # Database service
│   │   └── common/             # Filters, pipes, interceptors
│   ├── prisma/
│   │   ├── schema.prisma       # Full DB schema
│   │   └── seed/seed.ts        # Seed data
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # Next.js 14
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Portal landing (like uims.cuchd.in)
│   │   │   ├── login/          # Role-based login
│   │   │   ├── admin/          # Admin dashboard + modules
│   │   │   ├── teacher/        # Teacher panel
│   │   │   └── student/        # Student/Parent panel
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── AppShell.tsx # Sidebar + Topbar layout
│   │   └── lib/
│   │       ├── api.ts           # Axios client + all API calls
│   │       ├── auth.ts          # Auth utilities
│   │       └── utils.ts         # Helpers
│   ├── Dockerfile
│   └── .env.local
│
├── docker/
│   ├── docker-compose.yml      # Full stack orchestration
│   └── nginx/nginx.conf        # Reverse proxy config
│
└── scripts/
    └── setup.sh                # One-command setup script
```

---

## 🚀 Quick Start

### Option A: Local Development (Recommended for development)

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- npm or yarn

#### Step 1 – Clone & Install
```bash
# Install all dependencies
npm run install:all
```

#### Step 2 – Configure Environment
```bash
# Backend: edit the DATABASE_URL
cp backend/.env.example backend/.env
nano backend/.env
```

Update these in `backend/.env`:
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/sims_db"
JWT_SECRET="your-minimum-32-character-secret-key-here"
```

#### Step 3 – Setup Database
```bash
# Generate Prisma client + run migrations + seed data
npm run db:generate
npm run db:migrate
npm run db:seed
```

#### Step 4 – Start Dev Servers
```bash
# Terminal 1 – Backend (port 4000)
npm run dev:backend

# Terminal 2 – Frontend (port 3000)
npm run dev:frontend
```

#### Access
| Service       | URL                                |
|---------------|------------------------------------|
| 🌐 Portal     | http://localhost:3000              |
| 🔧 API        | http://localhost:4000/api/v1       |
| 📖 API Docs   | http://localhost:4000/api/docs     |
| 🗄️ DB Studio  | Run `npm run db:studio`            |

---

### Option B: Docker Compose (Recommended for production)

```bash
# Start everything (PostgreSQL + NestJS + Next.js + Nginx)
npm run docker:up

# With pgAdmin UI
npm run docker:dev

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

---

## 🔐 Default Login Credentials

| Role    | Email                              | Password        |
|---------|------------------------------------|-----------------|
| Admin   | admin@gnpss.edu.in                 | Admin@1234      |
| Teacher | sunita@gnpss.edu.in                | Teacher@1234    |
| Student | aarav@student.gnpss.edu.in         | Student@1234    |

> ⚠️ **Change all passwords immediately in production!**

---

## 🔌 API Reference

All endpoints are prefixed with `/api/v1`

### Auth
| Method | Endpoint                    | Description           | Access  |
|--------|-----------------------------|-----------------------|---------|
| POST   | `/auth/login`               | Login                 | Public  |
| POST   | `/auth/register`            | Register user         | Public  |
| GET    | `/auth/me`                  | Get current user      | Auth    |
| PATCH  | `/auth/change-password`     | Change password       | Auth    |

### Students
| Method | Endpoint                    | Description           | Access        |
|--------|-----------------------------|-----------------------|---------------|
| GET    | `/students`                 | List all students     | Admin/Teacher |
| POST   | `/students`                 | Create student        | Admin         |
| GET    | `/students/:id`             | Get student           | Admin/Teacher |
| PATCH  | `/students/:id`             | Update student        | Admin         |
| DELETE | `/students/:id`             | Delete student        | Admin         |
| GET    | `/students/stats`           | Student statistics    | Admin         |

### Fees
| Method | Endpoint                    | Description           | Access        |
|--------|-----------------------------|-----------------------|---------------|
| GET    | `/fees`                     | All fees              | Admin         |
| POST   | `/fees`                     | Create fee record     | Admin         |
| PATCH  | `/fees/:id/mark-paid`       | Mark as paid          | Admin         |
| PATCH  | `/fees/:id/payment`         | Update payment        | Admin         |
| GET    | `/fees/student/:id`         | Student's fees        | Admin/Student |
| GET    | `/fees/monthly-stats`       | Monthly analytics     | Admin         |

### Attendance
| Method | Endpoint                            | Description           | Access        |
|--------|-------------------------------------|-----------------------|---------------|
| POST   | `/attendance/bulk`                  | Mark bulk attendance  | Admin/Teacher |
| GET    | `/attendance/class/:cls`            | Class attendance      | Admin/Teacher |
| GET    | `/attendance/student/:id`           | Student attendance    | All           |
| GET    | `/attendance/class/:cls/summary`    | Class summary         | Admin/Teacher |

### Dashboard
| Method | Endpoint                    | Description           | Access  |
|--------|-----------------------------|-----------------------|---------|
| GET    | `/dashboard/admin`          | Admin analytics       | Admin   |
| GET    | `/dashboard/teacher`        | Teacher stats         | Teacher |
| GET    | `/dashboard/student`        | Student stats         | Student |

---

## 🌐 Deployment Guide

### Deploying to a VPS (Ubuntu 22.04)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin
```

#### 2. Deploy Application
```bash
# Clone / copy your project
git clone https://github.com/your-repo/sims.git
cd sims

# Create production .env in docker/
cat > docker/.env << 'EOF'
JWT_SECRET=your-very-strong-32-char-minimum-secret-key
NEXTAUTH_SECRET=another-strong-secret-for-nextauth
CLIENT_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
NEXTAUTH_URL=https://yourdomain.com
EOF

# Start all services
npm run docker:up
```

#### 3. Setup SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

### Deploying Backend to Railway / Render

1. Connect your GitHub repo
2. Set root directory to `backend`
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `node dist/main`
5. Add environment variables from `.env.example`

### Deploying Frontend to Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` → your Railway/Render backend URL
- `NEXTAUTH_SECRET` → random secure string

---

## 🗄️ Database Management

```bash
# View DB in browser UI
npm run db:studio

# Create a new migration
cd backend && npx prisma migrate dev --name add_new_feature

# Reset database (⚠️ deletes all data)
npm run db:reset

# View current schema
cat backend/prisma/schema.prisma
```

---

## 🔒 Role-Based Access Control

```
ADMIN   → Full access to all modules
TEACHER → Students (read), Attendance (write), Homework (write), Marks (write), Notices (read)
STUDENT → Own data only (attendance, fees, homework, notices)
PARENT  → Same as STUDENT
```

---

## 📊 Database Schema

```
User ─────────── Student ──── Fee
                          ├── Attendance
                          └── Mark

     ─────────── Teacher ──── Homework
                          └── Attendance (marks)

Class (standalone reference)
Notice (standalone)
```

---

## 🔧 Customization

### Change School Name
Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_SCHOOL_NAME="Your School Name"
NEXT_PUBLIC_SCHOOL_SHORT="YSN"
NEXT_PUBLIC_SCHOOL_CODE="YOUR_CBSE_CODE"
NEXT_PUBLIC_SCHOOL_CITY="Your City, State"
```

### Add New Module
1. `cd backend/src && nest generate module module-name`
2. Create service + controller following existing patterns
3. Import in `app.module.ts`
4. Add nav item in `frontend/src/components/layout/AppShell.tsx`
5. Create page in `frontend/src/app/[role]/module-name/page.tsx`

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `DATABASE_URL` connection error | Ensure PostgreSQL is running, check credentials |
| `Prisma client not generated` | Run `npm run db:generate` |
| `JWT_SECRET` error | Set a minimum 32-character secret in `.env` |
| Port 3000 in use | Change port in `frontend/package.json` dev script |
| Port 4000 in use | Change `PORT` in `backend/.env` |
| Docker fails to start | Run `docker compose down -v` then `up` again |

---

## 📞 Support

- **School IT**: itsupport@gnpss.edu.in
- **API Docs**: http://localhost:4000/api/docs (Swagger UI)
- **DB Studio**: Run `npm run db:studio`

---

*Built with ❤️ for Guru Nanak Public Senior Secondary School, Ludhiana*
