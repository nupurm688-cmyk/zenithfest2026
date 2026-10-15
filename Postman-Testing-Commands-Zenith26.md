# Postman Testing Guide — Zenith '26 College Fest Management System

This guide accompanies **PM2-01 (How Software Works)** and **PM2-02 (Front-End, Back-End & Mobile)**.
Use this checklist to test the API contract directly in Postman without relying solely on the web UI.

---

## 1. Quick Setup in Postman

1. **Launch Postman Desktop**:
   - Open Postman (Free tier; works completely signed-out or signed-in).
2. **Import Collection**:
   - Click **Import** (top left).
   - Drag & drop `zenith26-api.postman_collection.json` from your project folder.
3. **Verify Environment / Variables**:
   - The collection contains a variable `baseUrl` set to `http://127.0.0.1:8000`.
4. **Ensure FastAPI Server is Running**:
   ```bash
   uvicorn backend.main:app --reload
   ```
   Open `http://localhost:8000/docs` in your browser to verify Swagger docs are online.

---

## 2. Test Execution Matrix (18 Test Scenarios)

### Group A: Events Endpoints (`GET /api/events`)

#### Test 1: Fetch All Events
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events`
- **Expected Status**: `200 OK`
- **Expected Body**: Array of 14 event objects. Each event contains:
  ```json
  {
    "id": 1,
    "title": "Code Sprint 2.0",
    "category": "Technical",
    "description": "...",
    "event_date": "2026-11-14",
    "event_time": "10:00 AM",
    "venue": "Main Auditorium",
    "capacity": 100,
    "fee": 0,
    "icon": "💻",
    "available_seats": 100
  }
  ```

#### Test 2: Filter by Category (`Technical`)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?category=Technical`
- **Expected Status**: `200 OK`
- **Expected Body**: Array of 4 events (`Code Sprint 2.0`, `Robo Race`, `AI Pitch Fest`, `Web Design Rumble`).

#### Test 3: Filter by Category (`Cultural`)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?category=Cultural`
- **Expected Status**: `200 OK`
- **Expected Body**: Array of 5 events (`Battle of Bands`, `Dance Fiesta`, `Nukkad Natak`, `Fashion Fusion`, `Open Mic Night`).

#### Test 4: Search by Title Substring (`Sprint`)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?search=Sprint`
- **Expected Status**: `200 OK`
- **Expected Body**: Exactly 1 event (`Code Sprint 2.0`).

#### Test 5: Search with No Matches
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?search=NonExistentKeywordXYZ`
- **Expected Status**: `200 OK`
- **Expected Body**: Empty array `[]`.

---

### Group B: Single Event Detail (`GET /api/events/{id}`)

#### Test 6: Valid Event Detail (ID 1)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events/1`
- **Expected Status**: `200 OK`
- **Expected Body**: Single JSON object for `Code Sprint 2.0`.

#### Test 7: Non-Existent Event (ID 9999)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events/9999`
- **Expected Status**: `404 Not Found`
- **Expected Body**:
  ```json
  {
    "detail": "Event with id 9999 not found"
  }
  ```

---

### Group C: Event Registration (`POST /api/events/{id}/register`)

#### Test 8: Successful Registration (201 Created)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)**:
  ```json
  {
    "student_name": "Aarav Patel",
    "roll_number": "26CS042",
    "email": "aarav.patel@zenith.edu",
    "phone": "+91 9876543210"
  }
  ```
- **Expected Status**: `201 Created`
- **Expected Body**:
  ```json
  {
    "id": 1,
    "event_id": 1,
    "student_name": "Aarav Patel",
    "registered_at": "..."
  }
  ```

#### Test 9: Verify Seat Count Decreased Live
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events/1`
- **Expected Status**: `200 OK`
- **Expected Body**: `available_seats` should now be `99` (was 100).

#### Test 10: Duplicate Registration Rejection (409 Conflict)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Body**: (Re-send the exact same body from Test 8)
- **Expected Status**: `409 Conflict`
- **Expected Body**:
  ```json
  {
    "detail": "Already registered: this email is already signed up for this event"
  }
  ```

#### Test 11: Validation - Missing Student Name (400 Bad Request)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Body**:
  ```json
  {
    "student_name": "",
    "roll_number": "26CS099",
    "email": "missingname@zenith.edu"
  }
  ```
- **Expected Status**: `400 Bad Request`
- **Expected Body**:
  ```json
  {
    "detail": "Student name, roll number, and email must not be empty"
  }
  ```

#### Test 12: Validation - Missing Roll Number (400 Bad Request)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Body**:
  ```json
  {
    "student_name": "Pooja Sharma",
    "roll_number": "",
    "email": "pooja@zenith.edu"
  }
  ```
- **Expected Status**: `400 Bad Request`

#### Test 13: Validation - Invalid Email Missing '@' (400 Bad Request)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Body**:
  ```json
  {
    "student_name": "Rohan Gupta",
    "roll_number": "26ME033",
    "email": "rohangupatadotcom"
  }
  ```
- **Expected Status**: `400 Bad Request`
- **Expected Body**:
  ```json
  {
    "detail": "Invalid email address (must contain a valid '@' domain)"
  }
  ```

#### Test 14: Registration for Non-Existent Event (404 Not Found)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/8888/register`
- **Body**:
  ```json
  {
    "student_name": "Test User",
    "roll_number": "26TEST",
    "email": "test@zenith.edu"
  }
  ```
- **Expected Status**: `404 Not Found`

---

### Group D: Registrations Query (`GET /api/registrations`)

#### Test 15: Retrieve All Registrations
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/registrations`
- **Expected Status**: `200 OK`
- **Expected Body**: Array containing all student registrations with their corresponding `event_title`.

#### Test 16: Filter Registrations by Event
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/registrations?event_id=1`
- **Expected Status**: `200 OK`
- **Expected Body**: Array containing registrations for event ID 1 only.

---

### Group E: Live Fest Statistics (`GET /api/stats`)

#### Test 17: Computed Live Statistics
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/stats`
- **Expected Status**: `200 OK`
- **Expected Body**:
  ```json
  {
    "total_events": 14,
    "total_registrations": 1,
    "total_capacity": 1767,
    "overall_utilization_pct": 0.1,
    "upcoming_events_count": 14,
    "events_by_category": {
      "Technical": 4,
      "Cultural": 5,
      "Sports": 2,
      "Gaming": 1,
      "Workshop": 2
    }
  }
  ```

---

### Group F: Admin Stretch Endpoints

#### Test 18: Admin Add New Event (201 Created)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events`
- **Body**:
  ```json
  {
    "title": "Drone Obstacle Arena",
    "category": "Technical",
    "description": "Precision drone obstacle navigation and time-trial race.",
    "event_date": "2026-11-15",
    "event_time": "03:30 PM",
    "venue": "Open Ground B",
    "capacity": 35,
    "fee": 50,
    "icon": "🛸"
  }
  ```
- **Expected Status**: `201 Created`

---

## 3. Key PM Concepts Demonstrated

1. **Client vs. Server Truth**: The browser cannot decide if an event is full or if an email is unique. Only the backend database enforces this atomically.
2. **Never Trust the Client**: Form validations exist in the browser for user UX, but the FastAPI backend enforces mandatory independent checks (400/409).
3. **HTTP Status Code Discipline**:
   - `200 OK`: Resource successfully queried
   - `201 Created`: Resource successfully written to the database
   - `400 Bad Request`: Client sent malformed or invalid payload
   - `404 Not Found`: Target entity ID does not exist
   - `409 Conflict`: Business constraint violation (seat full or duplicate entry)
