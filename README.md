# 🏢 Enterprise Meeting Management System (MeetSpace)

A modern, enterprise-grade **Meeting Room Management & Reservation System** built with **Angular 19**, **FastAPI**, **SQLAlchemy**, and **PostgreSQL**.

---

## ✨ Key Features Showcase

### 🔁 Recurring / Repeated Meetings Engine
- 📅 **Multi-Frequency Pattern Support**:
  - **Daily Meetings**: Repeats every day for requested duration.
  - **Weekly Meetings**: Repeats every week on the same day (e.g. *Every Monday 10:00–11:00 AM*).
  - **Monthly Meetings**: Preserves exact day of month using calendar math (e.g. *Aug 18 → Sep 18 → Oct 18*).
- 🗓️ **Explicit Series Duration Selector**: Select `1 Month`, `2 Months`, `3 Months`, `6 Months`, or `Custom Count`.
- ⚡ **Multi-Slot Overlap & Conflict Protection**: Checks room availability for **EVERY** occurrence date before committing. If any single slot is occupied, it safely aborts and alerts the user with the exact conflicting occurrence.

---

### 👤 User Dashboard & Booking Experience
- 🏢 **Catalog & Availability Search**: Search meeting rooms by date, start/end time window, capacity, **Building**, and **Floor**.
- 🏢 **Cascading Dependent Location Filters**: Selecting a **Building** dynamically filters the **Floor** dropdown to show *only* the floors available in that specific building.
- ✨ **Room Amenities & Feature Badges**: Renders interactive equipment tags (`📽️ 4K Projector`, `📹 Video Conferencing`, `🪵 Whiteboard`, `📶 Wi-Fi`) on catalog cards and booking confirmation modals.
- 👥 **Scalable Participant Selection**: Autocomplete live user search (filtering non-admin employee accounts) with removable chip badges (`✕`).
- ⚡ **Double-Booking Row Locking**: Pessimistic row locking (`WITH FOR UPDATE`) and exact overlap logic:
  $$\text{existing.start} < \text{new.end} \quad \text{AND} \quad \text{existing.end} > \text{new.start}$$
- 📥 **iCal Sync (`.ics` Export)**: One-click export to Google Calendar, Microsoft Outlook, or Apple Calendar.
- 📋 **Copy Invite**: Copy formatted meeting invite text ready for Slack, Microsoft Teams, or Email.

---

### 🛡️ Executive Admin Control Panel (`/admin`)
- 📊 **Peak Demand & Room Popularity Analytics**:
  - 🏆 **Most Popular Room**: Name and confirmed booking count of the most booked room.
  - ⏰ **Busiest Time Slot**: Peak demand time window of the day (e.g. `10:00 AM - 11:00 AM`).
  - ⏱️ **Average Duration & Total Hours**: Average meeting duration in minutes and total hours reserved.
  - 📅 **Peak Day of Week**: Busiest day of the week for meeting demand.
- 🖼️ **System Image File Picker & Live Thumbnail Preview**:
  - Select local image files (`.png`, `.jpg`, `.webp`) directly from system disk using `FileReader` Base64 encoding.
  - Live thumbnail preview card rendered inside the modal.
- 🏷️ **Dynamic Room Features Tag Input**: Add custom hardware/amenities with `+ Add` button and removable chip tags (`[ ✨ 4K Projector ✕ ]`).
- 🏢 **Manage Rooms & Operational Statuses**:
  - Operational status control: `🟢 Available`, `🛠️ Under Maintenance`, `⛔ Currently Unavailable`.
- 📍 **Manage Workspace Locations (Pro CRUD)**:
  - Add & edit locations: `building_name`, `floor`, `block`, `city`, `address`, `is_active`.
- 👥 **Manage Users**:
  - Toggle Account Activation / Deactivation.
- 📅 **System Bookings Oversight & Details Modal**:
  - View all organization reservations.
  - Rich **View Booking Details Modal**: Agenda, user details, full location breakdown, creation timestamp, and invited participants.
- 🛡️ **Security Audit Logs (Compliance Trail)**:
  - Security event timeline tracking admin operations (`ROOM_UPDATED`, `LOCATION_CREATED`, `USER_ACTIVATED`, `BOOKING_CANCELLED`).
- 📥 **One-Click CSV Report Export**: Download formatted spreadsheet report (`.csv`) of all organization reservations.
- 🔍 **Admin Live Search**: Instant live search bar filtering across rooms, locations, users, bookings, and audit logs.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Angular 19, TypeScript, Vanilla CSS / Tailwind utilities, Reactive Forms |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy 2.0 (`Text` image URLs), Pydantic v2 |
| **Database** | PostgreSQL 16 (SQLite fallback for tests) with automatic SQL migrations |
| **Authentication** | Custom JWT (Bearer Access Tokens + Refresh Token Rotation) |
| **Testing** | FastAPI TestClient + SQLite test suite |

---

## 🚀 Quick Start Guide

### 1. Database Configuration

Configure `Backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meeting_db
JWT_SECRET_KEY=change-me-access-secret-key-32chars
JWT_REFRESH_SECRET_KEY=change-me-refresh-secret-key-32chars
```

> **Note**: Database schema tables, column migrations (`ALTER TABLE`), and seed data are initialized automatically on startup.

---

### 2. Backend Setup (FastAPI)

```powershell
cd Backend

# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI dev server
uvicorn app.main:app --reload
```

- **API Base URL**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`

---

### 3. Frontend Setup (Angular 19)

```powershell
cd Frontend

# Install node dependencies
npm install

# Start Angular development server
npm start
```

- **Web Application**: `http://localhost:4200`

---

## 🔑 Seeded Credentials

Automatically seeded on initial startup:

| Email | Password | Role | Access |
|---|---|---|---|
| `admin@meeting.com` | `admin123` | **Admin** | Full Executive Admin Control Panel (`/admin`) |
| `user@meeting.com` | `password123` | **User** | User Dashboard (`/dashboard`) |

*New users can also register via `/register`.*

---

## 📡 API Endpoints (`/api/v1`)

### 🔑 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login and receive JWT access + refresh tokens |
| `POST` | `/auth/refresh` | Rotate expired access token using refresh token |
| `POST` | `/auth/logout` | Revoke active refresh token |
| `GET` | `/auth/me` | Fetch authenticated user profile |
| `GET` | `/auth/users` | List all system users (for participant selection) |

### 📍 Locations (`/api/v1/locations`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/locations` | Fetch active workspace locations |

### 🏢 Meeting Rooms (`/api/v1/rooms`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/rooms` | List rooms with filters (`min_capacity`, `building_name`, `floor`, `start_time`, `end_time`) |
| `GET` | `/rooms/{id}` | Get specific room details |

### 📅 Bookings (`/api/v1/bookings`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/bookings` | List user bookings (`upcoming_only`, `past_only`) |
| `GET` | `/bookings/{id}` | Get specific booking details |
| `POST` | `/bookings` | Reserve room or recurring series (`DAILY`, `WEEKLY`, `MONTHLY`) |
| `PUT` | `/bookings/{id}` | Reschedule booking date/time |
| `DELETE` | `/bookings/{id}` | Cancel booking reservation |

### 🛡️ Admin Management (`/api/v1/admin`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/analytics` | Fetch peak demand & popularity analytics |
| `GET` | `/admin/rooms` | Fetch all rooms including inactive rooms |
| `POST` | `/admin/rooms` | Create a new room with custom features & image Base64 |
| `PUT` | `/admin/rooms/{id}` | Update room details, features, & operational status |
| `GET` | `/admin/locations` | Fetch all locations |
| `POST` | `/admin/locations` | Create a workspace location |
| `PUT` | `/admin/locations/{id}` | Update location details / active state |
| `GET` | `/admin/users` | Fetch all system users |
| `PUT` | `/admin/users/{id}/toggle-status` | Toggle user Active / Deactivated account state |
| `GET` | `/admin/bookings` | Overview of all organization bookings |
| `PUT` | `/admin/bookings/{id}/cancel` | Admin cancellation of any booking |
| `GET` | `/admin/audit-logs` | Fetch security compliance audit trail |

---

## 🧪 Testing & Database Utilities

### Run Integration Test Suite
```powershell
cd Backend
.venv\Scripts\python.exe test_api.py
```

### Reset Database Schema
```powershell
cd Backend
.venv\Scripts\python.exe reset_db.py
```

---

## 💎 Key Architecture Highlights

1. **Exact Calendar Month Math**: Monthly recurring meetings use `calendar.monthrange` to preserve exact day of the month across 28, 30, and 31-day months.
2. **System File Image Encoding**: Uploaded room thumbnails use `FileReader.readAsDataURL` stored in PostgreSQL `TEXT` columns for instant rendering without external image dependencies.
3. **Pessimistic Multi-Slot Validation**: Validates double-booking conflicts across all calculated recurring occurrences before committing any part of a series.
4. **Cascading Location Selectors**: Floor options dynamically react to Building selection, preventing invalid building-floor search queries.
