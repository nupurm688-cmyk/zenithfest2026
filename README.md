# Zenith '26 — College Fest Management System

A production-grade, vibe-coded full-stack web application for managing the annual **Zenith '26 College Fest**. Built as a capstone project for **PM2-01 (How Software Works)** and **PM2-02 (Front-End, Back-End & Mobile)**.

---

## ⚡ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5 + Tailwind CSS + Vanilla JS | Responsive student portal, event cards, filters, registration modals, and live admin dashboard. |
| **Backend** | Python + FastAPI + Uvicorn | High-performance asynchronous REST API, business rules, and strict server-side validation. |
| **Data Layer** | SQLite (`fest.db`) | Single-file embedded relational database with foreign keys and unique constraints. |
| **Seed Engine**| `openpyxl` | Seeds 14 initial fest competitions and workshops from `data/events_seed.xlsx`. |
| **API Testing**| Postman | Direct API contract verification and HTTP status code testing. |

---

## 📁 Project Architecture & Folder Structure

```
zenith26-fest-system/
├── backend/
│   ├── main.py              # FastAPI application, REST endpoints, static mounting & CORS
│   ├── database.py          # SQLite connection manager and DDL table schemas
│   ├── models.py            # Pydantic v2 data models & request/response contracts
│   └── seed_data.py         # openpyxl excel parser seeding fest.db on boot
├── frontend/
│   ├── index.html           # Student Event Portal (cards, search, category filters, registration modal)
│   ├── admin.html           # Fest Coordinator Admin Dashboard (live metrics, table, filters)
│   └── js/
│       ├── app.js           # Student portal event listeners, API fetch calls, and validations
│       └── admin.js         # Admin metrics calculations, sorting, and management actions
├── data/
│   └── events_seed.xlsx     # 14 seed events across Technical, Cultural, Sports, Gaming & Workshops
├── requirements.txt         # Python package dependencies
├── README.md                # Project documentation and guide
├── zenith26-api.postman_collection.json # Ready-to-import Postman test collection
└── Postman-Testing-Commands-Zenith26.md  # 18 test cases and expected responses
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- Python 3.10+ installed on your computer.

### 2. Activate Virtual Environment & Install Dependencies
Open a terminal in the `zenith26-fest-system` folder:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Windows Command Prompt
.\.venv\Scripts\activate.bat

# macOS / Linux
source .venv/bin/activate

# Install requirements (if not already installed)
pip install -r requirements.txt
```

### 3. Start the FastAPI Server
```bash
uvicorn backend.main:app --reload
```
On startup, the system will automatically:
- Create `fest.db` if it does not exist.
- Initialize the `events` and `registrations` tables.
- Seed all 14 events from `data/events_seed.xlsx`.

### 4. Open in Your Browser
- 🌐 **Student Event Portal**: [http://localhost:8000/](http://localhost:8000/)
- 📊 **Admin Dashboard**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- 📖 **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 REST API Contract

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/events` | List all events (supports `?category=` and `?search=`). Computes `available_seats` live. | `200 OK` |
| `GET` | `/api/events/{id}` | Retrieve details for a single event. | `200 OK`, `404 Not Found` |
| `POST` | `/api/events/{id}/register` | Register a student for an event with server-side validation. | `201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict` |
| `GET` | `/api/registrations` | List all student registrations (supports `?event_id=`). | `200 OK` |
| `GET` | `/api/stats` | Aggregated fest metrics computed fresh from the database. | `200 OK` |
| `POST` | `/api/events` | *(Stretch)* Admin creates a new event. | `201 Created`, `400 Bad Request` |
| `DELETE` | `/api/registrations/{id}` | *(Stretch)* Admin cancels a registration and releases the seat. | `200 OK`, `404 Not Found` |

---

## 🧪 Postman API Testing

1. Open **Postman Desktop**.
2. Click **Import** and select `zenith26-api.postman_collection.json`.
3. Set the collection variable `baseUrl` to `http://127.0.0.1:8000`.
4. Run the requests in order:
   - **Success (201)**: `POST /api/events/1/register` with complete student information.
   - **Missing Field (400)**: `POST /api/events/1/register` with an empty `student_name`.
   - **Invalid Email (400)**: `POST /api/events/1/register` with an email missing `@`.
   - **Duplicate Conflict (409)**: Re-send the same email to the same event.
   - Refer to `Postman-Testing-Commands-Zenith26.md` for the full 18-test suite.

---

## 🧠 Core PM Architectural Lessons

1. **Client vs. Server as Source of Truth**:
   - The browser UI is a display client. It never computes or stores whether an event has seats remaining.
   - Seat availability is computed live on the server via `capacity - COUNT(registrations)`. This prevents stale cached state and race conditions.
2. **"Never Trust the Client"**:
   - Client-side validation in JavaScript provides immediate visual feedback to the student.
   - The server independently validates every payload (non-empty strings, valid email structure, capacity limits, and unique emails) to guarantee data integrity.
3. **Explicit HTTP Status Codes**:
   - `200`: Successful data retrieval.
   - `201`: Successful entity creation.
   - `400`: Invalid client input.
   - `404`: Entity not found.
   - `409`: State conflict (event full or duplicate registration).
