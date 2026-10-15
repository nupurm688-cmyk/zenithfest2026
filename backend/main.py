import sys
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.database import get_db_connection, init_db
from backend.models import (
    EventCreateIn,
    EventDetail,
    EventOut,
    RegistrationDetailOut,
    RegistrationIn,
    RegistrationOut,
    StatsOut,
)
from backend.seed_data import seed_events

FRONTEND_DIR = BASE_DIR / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize schema and seed data
    init_db()
    try:
        seed_events()
    except Exception as e:
        print(f"Warning during seed: {e}")
    yield


app = FastAPI(
    title="Zenith '26 College Fest Management System API",
    description="REST API for Zenith '26 College Fest — Events, Registrations & Live Dashboard Statistics",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------


@app.get(
    "/api/events",
    response_model=List[EventOut],
    summary="List all events",
    tags=["Events"],
)
def get_events(
    category: Optional[str] = Query(None, description="Filter by event category"),
    search: Optional[str] = Query(None, description="Search query matching event title (case-insensitive)"),
):
    """Returns a list of events with live computed available_seats."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            e.id, e.title, e.category, e.description, e.event_date, e.event_time,
            e.venue, e.capacity, e.fee, e.icon,
            (e.capacity - COALESCE(COUNT(r.id), 0)) AS available_seats
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE 1=1
    """
    params = []

    if category and category.strip() and category.strip().lower() != "all":
        query += " AND LOWER(e.category) = LOWER(?)"
        params.append(category.strip())

    if search and search.strip():
        query += " AND LOWER(e.title) LIKE ?"
        params.append(f"%{search.strip().lower()}%")

    query += " GROUP BY e.id ORDER BY e.id ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    events = []
    for r in rows:
        events.append(
            EventOut(
                id=r["id"],
                title=r["title"],
                category=r["category"],
                description=r["description"],
                event_date=r["event_date"],
                event_time=r["event_time"],
                venue=r["venue"],
                capacity=r["capacity"],
                fee=r["fee"],
                icon=r["icon"],
                available_seats=max(0, r["available_seats"]),
            )
        )
    return events


@app.get(
    "/api/events/{event_id}",
    response_model=EventDetail,
    summary="Get single event details",
    tags=["Events"],
)
def get_event_detail(event_id: int):
    """Returns single event details or 404 if not found."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            e.id, e.title, e.category, e.description, e.event_date, e.event_time,
            e.venue, e.capacity, e.fee, e.icon,
            (e.capacity - COALESCE(COUNT(r.id), 0)) AS available_seats
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE e.id = ?
        GROUP BY e.id
    """
    cursor.execute(query, (event_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    return EventDetail(
        id=row["id"],
        title=row["title"],
        category=row["category"],
        description=row["description"],
        event_date=row["event_date"],
        event_time=row["event_time"],
        venue=row["venue"],
        capacity=row["capacity"],
        fee=row["fee"],
        icon=row["icon"],
        available_seats=max(0, row["available_seats"]),
    )


@app.post(
    "/api/events/{event_id}/register",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a student for an event",
    tags=["Registrations"],
)
def register_for_event(event_id: int, payload: RegistrationIn):
    """
    Registers a student for an event with rigorous server-side validation:
    - Checks event existence (404)
    - Validates required fields are non-empty (400)
    - Validates email contains '@' (400)
    - Checks capacity constraint (409)
    - Prevents duplicate registration for same email & event (409)
    """
    # 1. Server-side validation of fields
    student_name = payload.student_name.strip() if payload.student_name else ""
    roll_number = payload.roll_number.strip() if payload.roll_number else ""
    email = payload.email.strip() if payload.email else ""
    phone = payload.phone.strip() if payload.phone else None

    if not student_name or not roll_number or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student name, roll number, and email must not be empty",
        )

    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address (must contain a valid '@' domain)",
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 2. Check if event exists
        cursor.execute("SELECT id, capacity FROM events WHERE id = ?", (event_id,))
        event_row = cursor.fetchone()
        if not event_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id {event_id} not found",
            )

        event_capacity = event_row["capacity"]

        # 3. Check for duplicate registration by email for this event
        cursor.execute(
            "SELECT id FROM registrations WHERE event_id = ? AND LOWER(email) = LOWER(?)",
            (event_id, email),
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already registered: this email is already signed up for this event",
            )

        # 4. Check available capacity
        cursor.execute("SELECT COUNT(*) FROM registrations WHERE event_id = ?", (event_id,))
        current_registrations = cursor.fetchone()[0]

        if current_registrations >= event_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Event is full: maximum capacity reached",
            )

        # 5. Insert registration
        registered_at = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO registrations (event_id, student_name, roll_number, email, phone, registered_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (event_id, student_name, roll_number, email, phone, registered_at),
        )
        new_id = cursor.lastrowid
        conn.commit()

        return RegistrationOut(
            id=new_id,
            event_id=event_id,
            student_name=student_name,
            registered_at=registered_at,
        )

    finally:
        conn.close()


@app.get(
    "/api/registrations",
    response_model=List[RegistrationDetailOut],
    summary="List all registrations",
    tags=["Registrations"],
)
def get_registrations(
    event_id: Optional[int] = Query(None, description="Optional filter by event ID"),
):
    """Returns registrations including event titles for admin review."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            r.id, r.event_id, e.title AS event_title,
            r.student_name, r.roll_number, r.email, r.phone, r.registered_at
        FROM registrations r
        JOIN events e ON r.event_id = e.id
    """
    params = []
    if event_id is not None:
        query += " WHERE r.event_id = ?"
        params.append(event_id)

    query += " ORDER BY r.id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [
        RegistrationDetailOut(
            id=r["id"],
            event_id=r["event_id"],
            event_title=r["event_title"],
            student_name=r["student_name"],
            roll_number=r["roll_number"],
            email=r["email"],
            phone=r["phone"],
            registered_at=r["registered_at"],
        )
        for r in rows
    ]


@app.get(
    "/api/stats",
    response_model=StatsOut,
    summary="Live aggregate fest statistics",
    tags=["Admin Stats"],
)
def get_stats():
    """Returns live computed statistics directly from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM events")
    total_events = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM registrations")
    total_registrations = cursor.fetchone()[0]

    cursor.execute("SELECT COALESCE(SUM(capacity), 0) FROM events")
    total_capacity = cursor.fetchone()[0]

    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM events WHERE event_date >= ?", (today_str,))
    upcoming_events_count = cursor.fetchone()[0]

    cursor.execute("SELECT category, COUNT(*) as cnt FROM events GROUP BY category")
    cat_rows = cursor.fetchall()
    events_by_category = {r["category"]: r["cnt"] for r in cat_rows}

    conn.close()

    overall_utilization_pct = 0.0
    if total_capacity > 0:
        overall_utilization_pct = round((total_registrations / total_capacity) * 100.0, 1)

    return StatsOut(
        total_events=total_events,
        total_registrations=total_registrations,
        total_capacity=total_capacity,
        overall_utilization_pct=overall_utilization_pct,
        upcoming_events_count=upcoming_events_count,
        events_by_category=events_by_category,
    )


# ---------------------------------------------------------------------------
# Stretch Goals: Admin Event Creation & Registration Deletion
# ---------------------------------------------------------------------------


@app.post(
    "/api/events",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Create a new event (Stretch)",
    tags=["Admin Actions"],
)
def create_event(payload: EventCreateIn):
    """Allows fest admin to create an event with server-side validation."""
    title = payload.title.strip() if payload.title else ""
    category = payload.category.strip() if payload.category else ""
    event_date = payload.event_date.strip() if payload.event_date else ""
    event_time = payload.event_time.strip() if payload.event_time else ""
    venue = payload.venue.strip() if payload.venue else ""

    if not title or not category or not event_date or not event_time or not venue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title, category, date, time, and venue are all required.",
        )

    if payload.capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capacity must be a positive integer greater than 0.",
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO events (title, category, description, event_date, event_time, venue, capacity, fee, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            title,
            category,
            payload.description,
            event_date,
            event_time,
            venue,
            payload.capacity,
            max(0, payload.fee),
            payload.icon or "🎯",
        ),
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return EventOut(
        id=new_id,
        title=title,
        category=category,
        description=payload.description,
        event_date=event_date,
        event_time=event_time,
        venue=venue,
        capacity=payload.capacity,
        fee=payload.fee,
        icon=payload.icon or "🎯",
        available_seats=payload.capacity,
    )


@app.delete(
    "/api/registrations/{registration_id}",
    summary="Admin: Cancel a registration (Stretch)",
    tags=["Admin Actions"],
)
def delete_registration(registration_id: int):
    """Allows fest admin to cancel/delete a student's registration."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, event_id, student_name FROM registrations WHERE id = ?", (registration_id,))
    reg = cursor.fetchone()
    if not reg:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {registration_id} not found.",
        )

    cursor.execute("DELETE FROM registrations WHERE id = ?", (registration_id,))
    conn.commit()
    conn.close()

    return {
        "message": f"Registration {registration_id} for {reg['student_name']} cancelled successfully.",
        "registration_id": registration_id,
        "event_id": reg["event_id"],
    }


# ---------------------------------------------------------------------------
# Static Files & Frontend Serving
# ---------------------------------------------------------------------------

# Mount JavaScript assets directory
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")


@app.get("/", response_class=FileResponse, include_in_schema=False)
def serve_home():
    """Serves the student event portal."""
    index_file = FRONTEND_DIR / "index.html"
    return FileResponse(index_file)


@app.get("/admin.html", response_class=FileResponse, include_in_schema=False)
def serve_admin():
    """Serves the admin dashboard."""
    admin_file = FRONTEND_DIR / "admin.html"
    return FileResponse(admin_file)
