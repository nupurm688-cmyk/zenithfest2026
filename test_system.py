import json
import sys
import urllib.error
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"


def req(method, path, body=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req_obj = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req_obj) as res:
            res_body = res.read().decode("utf-8")
            try:
                parsed = json.loads(res_body)
            except Exception:
                parsed = res_body
            return res.status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed


print("=== Verifying Live Zenith '26 Server on http://127.0.0.1:8000 ===")

# 1. Frontend routes
status, body = req("GET", "/")
assert status == 200, f"GET / failed with {status}"
assert "ZENITH" in body
print("[PASS] GET / serves student portal (index.html)")

status, body = req("GET", "/admin.html")
assert status == 200, f"GET /admin.html failed with {status}"
assert "Admin Console" in body
print("[PASS] GET /admin.html serves admin dashboard (admin.html)")

status, body = req("GET", "/js/app.js")
assert status == 200
print("[PASS] GET /js/app.js served successfully")

# 2. Events API
status, events = req("GET", "/api/events")
assert status == 200
assert len(events) >= 14, f"Expected 14 events, got {len(events)}"
print(f"[PASS] GET /api/events returned {len(events)} events with live available_seats")

# Category filter
status, tech = req("GET", "/api/events?category=Technical")
assert status == 200 and len(tech) == 4
print("[PASS] GET /api/events?category=Technical returned 4 events")

# Search query
status, search_res = req("GET", "/api/events?search=Sprint")
assert status == 200 and len(search_res) == 1 and "Sprint" in search_res[0]["title"]
print(f"[PASS] GET /api/events?search=Sprint returned: {search_res[0]['title']}")

# Single event detail
status, ev1 = req("GET", "/api/events/1")
assert status == 200 and ev1["id"] == 1
print(f"[PASS] GET /api/events/1 returned: {ev1['title']} ({ev1['available_seats']} seats open)")

# Non-existent event
status, err404 = req("GET", "/api/events/9999")
assert status == 404
print(f"[PASS] GET /api/events/9999 returned 404: {err404['detail']}")

# Registration validation: Missing name
status, err400_name = req(
    "POST",
    "/api/events/1/register",
    {"student_name": "", "roll_number": "26CS001", "email": "test@zenith.edu"},
)
assert status == 400
print(f"[PASS] POST /api/events/1/register (empty name) returned 400: {err400_name['detail']}")

# Registration validation: Invalid email
status, err400_email = req(
    "POST",
    "/api/events/1/register",
    {"student_name": "Rohan", "roll_number": "26CS001", "email": "rohanzenithedu"},
)
assert status == 400
print(f"[PASS] POST /api/events/1/register (invalid email) returned 400: {err400_email['detail']}")

# Successful registration
test_email = "nupur.test@zenith.edu"
status, reg_succ = req(
    "POST",
    "/api/events/1/register",
    {"student_name": "Nupur Mathur", "roll_number": "26CS099", "email": test_email, "phone": "9876543210"},
)
assert status == 201
reg_id = reg_succ["id"]
print(f"[PASS] POST /api/events/1/register SUCCESS returned 201: Registration #{reg_id} for {reg_succ['student_name']}")

# Duplicate email registration conflict
status, err409 = req(
    "POST",
    "/api/events/1/register",
    {"student_name": "Nupur Mathur", "roll_number": "26CS099", "email": test_email},
)
assert status == 409
print(f"[PASS] POST /api/events/1/register duplicate returned 409 Conflict: {err409['detail']}")

# Verify seat decreased
status, ev1_after = req("GET", "/api/events/1")
assert ev1_after["available_seats"] == ev1["available_seats"] - 1
print(f"[PASS] Live seat count decremented from {ev1['available_seats']} to {ev1_after['available_seats']}")

# Registrations list check
status, all_regs = req("GET", "/api/registrations")
assert status == 200
found_reg = next((r for r in all_regs if r["id"] == reg_id), None)
assert found_reg is not None and found_reg["event_title"] == "Code Sprint 2.0"
print(f"[PASS] GET /api/registrations contains new registration with event title: '{found_reg['event_title']}'")

# Stats check
status, stats = req("GET", "/api/stats")
assert status == 200
print(f"[PASS] GET /api/stats: {stats['total_events']} events, {stats['total_registrations']} registrations, utilization {stats['overall_utilization_pct']}%, upcoming: {stats['upcoming_events_count']}")

# Stretch: Admin Delete Registration
status, del_res = req("DELETE", f"/api/registrations/{reg_id}")
assert status == 200
print(f"[PASS] DELETE /api/registrations/{reg_id} cancelled registration: {del_res['message']}")

# Verify seat restored
status, ev1_restored = req("GET", "/api/events/1")
assert ev1_restored["available_seats"] == ev1["available_seats"]
print(f"[PASS] Available seats restored back to {ev1_restored['available_seats']}")

print("\n🎉 ALL TESTS PASSED! FULL-STACK SYSTEM FULLY OPERATIONAL!")
