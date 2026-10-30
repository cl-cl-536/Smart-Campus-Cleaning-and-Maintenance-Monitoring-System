"""
Smart Campus Cleaning and Maintenance Monitoring System
Database module with SQLite initialization and seed data.
"""

import os
import sqlite3
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'campus_maintenance.db')

VALID_ZONES = [
    'College Building',
    'Euphoria Stairs',
    'Canteen',
    'Open Canteen',
    'Samvad',
    'Backcourt'
]

VALID_FLOORS = [
    'Ground',
    '1', '2', '3', '4', '5', '6', '7', '8', '9'
]

OUTDOOR_ZONES = [
    'Euphoria Stairs',
    'Open Canteen',
    'Backcourt'
]


def get_db():
    """Returns a database connection with dict-like row access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    """Initializes tables and populates seed data if empty."""
    conn = get_db()
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'staff', 'reporter')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Create issues table with new zone, floor, room, exact_location
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone TEXT NOT NULL CHECK(zone IN ('College Building', 'Euphoria Stairs', 'Canteen', 'Open Canteen', 'Samvad', 'Backcourt')),
            floor TEXT NOT NULL CHECK(floor IN ('Ground', '1', '2', '3', '4', '5', '6', '7', '8', '9')),
            room TEXT,
            exact_location TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('Cleaning', 'Electrical', 'Plumbing', 'Furniture', 'Other')),
            description TEXT NOT NULL,
            priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High')),
            photo_path TEXT,
            status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Assigned', 'In Progress', 'Completed')),
            reported_by INTEGER NOT NULL,
            assigned_to INTEGER,
            completion_note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reported_by) REFERENCES users(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        );
    """)

    # Create history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            performed_by INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
            FOREIGN KEY (performed_by) REFERENCES users(id)
        );
    """)

    conn.commit()

    # Check if seed data already exists
    cursor.execute("SELECT COUNT(*) as count FROM users;")
    user_count = cursor.fetchone()['count']

    if user_count == 0:
        seed_users_and_issues(conn)

    conn.close()


def seed_users_and_issues(conn):
    """Populates initial demo users, realistic issues, and maintenance history."""
    cursor = conn.cursor()

    # 1. Demo Users
    demo_users = [
        ("System Administrator", "admin", "admin123", "admin"),
        ("Facility Supervisor", "supervisor", "super123", "supervisor"),
        ("Ramesh Kumar (Cleaning Staff)", "staff1", "staff123", "staff"),
        ("Sunita Sharma (Maintenance Staff)", "staff2", "staff123", "staff"),
        ("Alex Johnson (Student)", "reporter", "report123", "reporter"),
        ("Priya Sharma (Student)", "reporter2", "report123", "reporter"),
        ("David Chen (Research Scholar)", "reporter3", "report123", "reporter"),
        ("Amina Yusuf (Campus Staff)", "reporter4", "report123", "reporter"),
    ]

    user_ids = {}
    for name, username, password, role in demo_users:
        pw_hash = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?);",
            (name, username, pw_hash, role)
        )
        user_ids[username] = cursor.lastrowid

    admin_id = user_ids["admin"]
    super_id = user_ids["supervisor"]
    staff1_id = user_ids["staff1"]
    staff2_id = user_ids["staff2"]
    reporter_id = user_ids["reporter"]

    now = datetime.now()

    # 2. Seed Issues with the 6 zones, floors, room, and exact location
    sample_issues = [
        {
            "zone": "College Building",
            "floor": "3",
            "room": "Room 304",
            "exact_location": "Near workstation 14, left side of the corridor",
            "category": "Cleaning",
            "description": "Coffee spill across workbenches and floor near workstation 14. Needs sanitizing.",
            "priority": "Medium",
            "photo_path": None,
            "status": "Completed",
            "reported_by": reporter_id,
            "assigned_to": staff1_id,
            "completion_note": "Mopped and sanitized all desks in row 3. Trash bin emptied.",
            "hours_ago": 48,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 48),
                ("Assigned to Ramesh Kumar by Supervisor", super_id, 46),
                ("Status changed to In Progress by Ramesh Kumar", staff1_id, 44),
                ("Task Completed by Ramesh Kumar: Mopped and sanitized all desks in row 3.", staff1_id, 42)
            ]
        },
        {
            "zone": "College Building",
            "floor": "2",
            "room": "Restroom 2nd Floor (East)",
            "exact_location": "Beneath washbasin sink 2, near the mirror",
            "category": "Plumbing",
            "description": "Continuous water leakage beneath washbasin sink 2 causing slippery floor.",
            "priority": "High",
            "photo_path": None,
            "status": "In Progress",
            "reported_by": reporter_id,
            "assigned_to": staff2_id,
            "completion_note": None,
            "hours_ago": 26,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 26),
                ("Priority set to High and Assigned to Sunita Sharma", super_id, 24),
                ("Status changed to In Progress by Sunita Sharma (Replaced faulty pipe washer)", staff2_id, 4)
            ]
        },
        {
            "zone": "College Building",
            "floor": "1",
            "room": "Lecture Hall 101",
            "exact_location": "Blackboard stage switchboard casing",
            "category": "Electrical",
            "description": "Flickering overhead tube lights on the blackboard stage and exposed switch casing.",
            "priority": "High",
            "photo_path": None,
            "status": "Assigned",
            "reported_by": reporter_id,
            "assigned_to": staff2_id,
            "completion_note": None,
            "hours_ago": 18,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 18),
                ("Assigned to Sunita Sharma by Supervisor", super_id, 12)
            ]
        },
        {
            "zone": "College Building",
            "floor": "Ground",
            "room": "Quiet Study Area",
            "exact_location": "Row C window-side study tables",
            "category": "Furniture",
            "description": "Broken ergonomic chair caster wheel and unstable desk wobbling in row C.",
            "priority": "Low",
            "photo_path": None,
            "status": "Pending",
            "reported_by": reporter_id,
            "assigned_to": None,
            "completion_note": None,
            "hours_ago": 10,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 10)
            ]
        },
        {
            "zone": "Euphoria Stairs",
            "floor": "Ground",
            "room": "",
            "exact_location": "Second flight landing near the main handrail",
            "category": "Cleaning",
            "description": "Mud and accumulated leaf litter on the stairs causing slip hazard after rains.",
            "priority": "High",
            "photo_path": None,
            "status": "In Progress",
            "reported_by": reporter_id,
            "assigned_to": staff1_id,
            "completion_note": None,
            "hours_ago": 15,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 15),
                ("Assigned to Ramesh Kumar by Facility Supervisor", super_id, 14),
                ("Status updated to In Progress by Ramesh Kumar", staff1_id, 3)
            ]
        },
        {
            "zone": "Euphoria Stairs",
            "floor": "2",
            "room": "",
            "exact_location": "Upper landing overlooking the central garden",
            "category": "Other",
            "description": "Step tread grip strip peeling off on the 4th step from top.",
            "priority": "Medium",
            "photo_path": None,
            "status": "Assigned",
            "reported_by": super_id,
            "assigned_to": staff2_id,
            "completion_note": None,
            "hours_ago": 20,
            "history": [
                ("Issue reported by Facility Supervisor", super_id, 20),
                ("Assigned to Sunita Sharma by Facility Supervisor", super_id, 19)
            ]
        },
        {
            "zone": "Canteen",
            "floor": "Ground",
            "room": "Dining Hall",
            "exact_location": "Near tables 12-16 by the beverage dispenser",
            "category": "Cleaning",
            "description": "Food crumbs and sticky syrup stains around tables 12-16 after lunch rush.",
            "priority": "Medium",
            "photo_path": None,
            "status": "Completed",
            "reported_by": reporter_id,
            "assigned_to": staff1_id,
            "completion_note": "Cleaned and sanitized tables with anti-bacterial spray. Floor swept and mopped.",
            "hours_ago": 72,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 72),
                ("Assigned to Ramesh Kumar by Supervisor", super_id, 71),
                ("Status changed to In Progress by Ramesh Kumar", staff1_id, 70),
                ("Task Completed by Ramesh Kumar: Sanitized dining tables.", staff1_id, 68)
            ]
        },
        {
            "zone": "Canteen",
            "floor": "1",
            "room": "Kitchen Wash Area",
            "exact_location": "Drainage outlet near commercial dishwash sink",
            "category": "Plumbing",
            "description": "Slow drain and grease trap blockage overflowing onto prep floor.",
            "priority": "High",
            "photo_path": None,
            "status": "In Progress",
            "reported_by": reporter_id,
            "assigned_to": staff2_id,
            "completion_note": None,
            "hours_ago": 8,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 8),
                ("Assigned to Sunita Sharma", super_id, 7),
                ("Status changed to In Progress by Sunita Sharma (Clearing drain trap)", staff2_id, 2)
            ]
        },
        {
            "zone": "Open Canteen",
            "floor": "Ground",
            "room": "",
            "exact_location": "Picnic benches under the shade umbrella, east corner",
            "category": "Cleaning",
            "description": "Overflowing waste bin and spilled beverage cups on outdoor pavement.",
            "priority": "Low",
            "photo_path": None,
            "status": "Pending",
            "reported_by": reporter_id,
            "assigned_to": None,
            "completion_note": None,
            "hours_ago": 5,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 5)
            ]
        },
        {
            "zone": "Samvad",
            "floor": "Ground",
            "room": "Main Auditorium",
            "exact_location": "Audio control console near emergency exit door",
            "category": "Electrical",
            "description": "Emergency exit signage unlit and flickering overhead light above row J.",
            "priority": "High",
            "photo_path": None,
            "status": "Pending",
            "reported_by": reporter_id,
            "assigned_to": None,
            "completion_note": None,
            "hours_ago": 3,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 3)
            ]
        },
        {
            "zone": "Samvad",
            "floor": "1",
            "room": "Conference Hall A",
            "exact_location": "Window blinds on south side facing courtyard",
            "category": "Furniture",
            "description": "Curtain rod dislodged on south window blinds; sunlight blinding presentation screen.",
            "priority": "Low",
            "photo_path": None,
            "status": "Pending",
            "reported_by": reporter_id,
            "assigned_to": None,
            "completion_note": None,
            "hours_ago": 2,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 2)
            ]
        },
        {
            "zone": "Backcourt",
            "floor": "Ground",
            "room": "",
            "exact_location": "Near sports equipment locker shed boundary",
            "category": "Cleaning",
            "description": "Discarded plastic packaging and water bottles piled beside basketball court line.",
            "priority": "Medium",
            "photo_path": None,
            "status": "Completed",
            "reported_by": super_id,
            "assigned_to": staff1_id,
            "completion_note": "Collected discarded materials and swept court boundary perimeter.",
            "hours_ago": 96,
            "history": [
                ("Issue reported by Facility Supervisor", super_id, 96),
                ("Assigned to Ramesh Kumar", super_id, 94),
                ("Status changed to In Progress by Ramesh Kumar", staff1_id, 92),
                ("Task Completed by Ramesh Kumar", staff1_id, 90)
            ]
        },
        {
            "zone": "College Building",
            "floor": "4",
            "room": "Computer Lab 402",
            "exact_location": "Exhaust vent grille above emergency exit",
            "category": "Cleaning",
            "description": "Heavy dust accumulation on exhaust vents and air filter grilles.",
            "priority": "Low",
            "photo_path": None,
            "status": "Completed",
            "reported_by": admin_id,
            "assigned_to": staff1_id,
            "completion_note": "Vacuumed external filters and wiped down grills with microfiber cloths.",
            "hours_ago": 120,
            "history": [
                ("Issue reported by System Administrator", admin_id, 120),
                ("Assigned to Ramesh Kumar", super_id, 118),
                ("Status changed to In Progress", staff1_id, 115),
                ("Task Completed by Ramesh Kumar", staff1_id, 112)
            ]
        },
        {
            "zone": "College Building",
            "floor": "5",
            "room": "Faculty Lounge",
            "exact_location": "Water dispenser tap and splash tray",
            "category": "Plumbing",
            "description": "Dispenser nozzle dripping continuously, drainage tray overflowing.",
            "priority": "Medium",
            "photo_path": None,
            "status": "Assigned",
            "reported_by": reporter_id,
            "assigned_to": staff2_id,
            "completion_note": None,
            "hours_ago": 12,
            "history": [
                ("Issue reported by Alex Johnson", reporter_id, 12),
                ("Assigned to Sunita Sharma by Supervisor", super_id, 10)
            ]
        }
    ]

    for item in sample_issues:
        created_time = (now - timedelta(hours=item["hours_ago"])).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO issues (
                zone, floor, room, exact_location, category, description,
                priority, photo_path, status, reported_by, assigned_to,
                completion_note, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            item["zone"], item["floor"], item["room"], item["exact_location"],
            item["category"], item["description"], item["priority"], item["photo_path"],
            item["status"], item["reported_by"], item["assigned_to"],
            item["completion_note"], created_time, created_time
        ))
        issue_id = cursor.lastrowid

        for action_text, performer_id, hist_hours_ago in item["history"]:
            hist_time = (now - timedelta(hours=hist_hours_ago)).strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO history (issue_id, action, performed_by, timestamp)
                VALUES (?, ?, ?, ?);
            """, (issue_id, action_text, performer_id, hist_time))

    conn.commit()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully with demo users and sample issues.")
