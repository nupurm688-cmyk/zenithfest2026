from typing import Dict, Optional
from pydantic import BaseModel, Field


class EventOut(BaseModel):
    id: int = Field(..., description="Unique event ID")
    title: str = Field(..., description="Event title")
    category: str = Field(..., description="Event category (Technical, Cultural, Sports, Gaming, Workshop)")
    description: Optional[str] = Field(None, description="Detailed description of the event")
    event_date: str = Field(..., description="Event date in YYYY-MM-DD format")
    event_time: str = Field(..., description="Event start time (e.g., 10:00 AM)")
    venue: str = Field(..., description="Campus venue location")
    capacity: int = Field(..., description="Maximum allowed seats")
    fee: int = Field(0, description="Registration fee in INR (0 means Free)")
    icon: Optional[str] = Field(None, description="Emoji icon representing the event")
    available_seats: int = Field(..., description="Live available seats (capacity - registrations)")


class EventDetail(EventOut):
    """Event detail view shape, matching EventOut."""
    pass


class RegistrationIn(BaseModel):
    student_name: str = Field(..., description="Full name of student")
    roll_number: str = Field(..., description="College roll number or student ID")
    email: str = Field(..., description="Valid student email address")
    phone: Optional[str] = Field(None, description="Contact phone number (optional)")


class RegistrationOut(BaseModel):
    id: int = Field(..., description="Registration ID")
    event_id: int = Field(..., description="Event ID")
    student_name: str = Field(..., description="Student name")
    registered_at: str = Field(..., description="Timestamp of registration (ISO format)")


class RegistrationDetailOut(BaseModel):
    id: int = Field(..., description="Registration ID")
    event_id: int = Field(..., description="Event ID")
    event_title: str = Field(..., description="Title of the registered event")
    student_name: str = Field(..., description="Student name")
    roll_number: str = Field(..., description="Roll number")
    email: str = Field(..., description="Student email")
    phone: Optional[str] = Field(None, description="Phone number")
    registered_at: str = Field(..., description="Timestamp of registration")


class StatsOut(BaseModel):
    total_events: int = Field(..., description="Total count of fest events")
    total_registrations: int = Field(..., description="Total count of student registrations across all events")
    total_capacity: int = Field(..., description="Total capacity across all events")
    overall_utilization_pct: float = Field(..., description="Overall registration utilization percentage")
    upcoming_events_count: int = Field(..., description="Count of events occurring today or later")
    events_by_category: Dict[str, int] = Field(..., description="Mapping of category name to event count")


class EventCreateIn(BaseModel):
    title: str = Field(..., description="Title of the new event")
    category: str = Field(..., description="Category (Technical, Cultural, Sports, Gaming, Workshop)")
    description: Optional[str] = Field(None, description="Event description")
    event_date: str = Field(..., description="Date (YYYY-MM-DD)")
    event_time: str = Field(..., description="Time (e.g., 10:00 AM)")
    venue: str = Field(..., description="Venue location")
    capacity: int = Field(..., description="Capacity (must be > 0)")
    fee: int = Field(0, description="Fee in INR")
    icon: Optional[str] = Field("🎯", description="Emoji icon")
