# Smart Campus Cleaning and Maintenance Monitoring System

An HMI (Human-Machine Interaction) course project that replaces manual cleaning registers with a modern, central web application for campus cleaning and maintenance management.

---

## Problem
Cleaning and maintenance in classrooms, labs, washrooms, and corridors is hard to track with paper registers. Issues get overlooked, status updates are lost, and facilities teams have no real-time oversight. 

This system provides a human-centered digital platform that lets anyone on campus report issues, enables supervisors to assign and prioritize work, empowers cleaning staff to update progress directly, and gives administrators comprehensive visibility through real-time dashboards and analytics.

---

## User Roles
| Role | Demo Username | Demo Password | What They Can Do |
|------|---------------|---------------|------------------|
| **Admin** | `admin` | `admin123` | Full system oversight, operational analytics, Chart.js visual trends, user management (add/remove users and assign roles), and complete maintenance audit history. |
| **Supervisor** | `supervisor` | `super123` | Review all campus issues, filter by zone/floor/status/priority/category, assign tasks to cleaning staff via dynamic dropdown, adjust priority levels, and track progress. |
| **Cleaning Staff** | `staff1` / `staff2` | `staff123` | View assigned task queue, transition tasks from *Assigned* -> *In Progress* -> *Completed*, add completion notes, and attach resolution records. |
| **Reporter** (student/staff) | `reporter`, `reporter2`, `reporter3`, `reporter4` | `report123` | Submit issues with campus zone, floor, room number, exact location, category, priority, and optional photo upload with preview. Track status of submitted reports and view audit timelines. |

---

## Features
- **Public Reporter Sign Up**: Students and staff can create their own account via `signup.html` with real-time validation, password matching checks, and secure PBKDF2 hashing. All self-registered users are assigned the `Reporter` role.
- **Role-Based Authentication and Access Control (RBAC)**: Secure session-based login with password hashing via `werkzeug.security`. Automatic redirection to role-specific workspaces.
- **Interactive Quick-Fill Demo Logins**: One-click demo credentials filling on the login page for rapid evaluation and testing.
- **Comprehensive Issue Reporting (Structured Location)**:
  - **Campus Zone / Area** (Dropdown): College Building, Euphoria Stairs, Canteen, Open Canteen, Samvad, Backcourt.
  - **Floor No** (Dropdown): Ground, 1, 2, 3, 4, 5, 6, 7, 8, 9.
  - **Room No** (Text Input): Required for indoor areas, optional for outdoor zones (Euphoria Stairs, Open Canteen, Backcourt).
  - **Exact Location** (Text Input): Mandatory landmark/position details (e.g., "Near the water cooler, left side of the corridor").
  - **Category**: Cleaning, Electrical, Plumbing, Furniture, Other.
  - **Urgency / Priority**: Low, Medium, High.
  - **Optional Photo Upload**: Drag-and-drop zone with instant image preview.
  - **Instant Feedback**: Toast notification and issue tracking ID (#101).
- **Supervisor Operations Board**:
  - Summary metric counters (Total, Pending, Assigned, In Progress, Completed).
  - Multi-parameter live search and filters (Zone, Floor, Status, Priority, Category).
  - Instant staff dispatch dropdown with immediate database persistence.
  - Interactive priority changer.
- **Cleaning Staff Work Queue**:
  - Filterable tabs (*All*, *To Do*, *In Progress*, *Completed*).
  - Task cards showing formatted location ("Zone, Floor X, Room, Exact location"), description, photo preview, and priority indicators.
  - Action buttons: "Start Work" and "Mark Completed".
  - Modal completion note dialog to describe repairs and cleaning actions taken.
- **Admin Command Center**:
  - Real-time KPI summary cards (Total, Pending, In Progress, Completed, High Priority).
  - Interactive Chart.js analytics:
    1. Issues by Status (Doughnut Chart)
    2. Issues by Category (Bar Chart)
    3. Issues by Campus Zone (Horizontal Bar Chart across the six zones)
  - Complete campus task registry with search, zone, floor, and category filters.
  - User Management table with modal to create new users and delete existing accounts (with confirmation modal).
  - Global Maintenance History Timeline with actor attribution, timestamps, and action records.
- **HMI and Human-Centered Design**:
  - Calm, modern color palette (blue/teal main, emerald green for Completed, amber for In Progress, rose for High Priority).
  - Light / Dark mode toggle with instant theme switching and `localStorage` persistence.
  - Clean two-column responsive form layout on desktop, single-column on mobile.
  - Friendly empty states, loading indicators, toast notifications, and modal confirmation safeguards.
  - Clean interface with zero emojis.

---

## Workflow
```
Report Issue -> Supervisor Reviews & Assigns Staff -> Staff Starts Work (In Progress) -> Staff Completes Task (with Note) -> Admin Monitors & Audits
```

---

## Tech Stack
| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Responsive, framework-free single-bundle frontend |
| **Backend** | Python Flask | RESTful API server and static asset hosting |
| **Database** | SQLite3 (`campus_maintenance.db`) | Relational database auto-initialized with schema and rich seed data |
| **Charts** | Chart.js (CDN) | Interactive canvas-based charts for administrative analytics |
| **Icons** | Font Awesome 6 (CDN) | Recognizable interface iconography |
| **Security** | Werkzeug Security | PBKDF2 password hashing and secure filename sanitization |

---

## Project Structure
```text
Smart-Campus-Cleaning-and-Maintenance-Monitoring-System/
├── backend/
│   ├── app.py                 # Flask server, REST APIs, and RBAC routes
│   ├── database.py            # SQLite schema, connection helper, and seed data generator
│   ├── requirements.txt       # Python dependencies (Flask, Werkzeug)
│   ├── uploads/               # Stored issue photos (.gitkeep)
│   └── campus_maintenance.db  # SQLite database (auto-created on first run)
├── frontend/
│   ├── index.html             # Login portal with quick demo switchers
│   ├── signup.html            # Public Reporter account registration
│   ├── report.html            # Issue reporting form and personal tracking
│   ├── supervisor.html        # Supervisor task assignment and filtering board
│   ├── staff.html             # Cleaning staff work queue and completion dialogs
│   ├── admin.html             # Admin analytics, charts, user management, and history
│   ├── css/
│   │   └── style.css          # Design system, light/dark themes, responsive layout
│   └── js/
│       ├── api.js             # API client, toast notifications, modals, auth check, theme manager
│       ├── auth.js            # Login handling and role routing
│       ├── signup.js          # Sign up validation, password matching, and registration
│       ├── report.js          # Location validation, photo preview, and personal tracker
│       ├── supervisor.js      # Supervisor filtering (zone/floor), staff assignment
│       ├── staff.js           # Staff workload cards, Start Work, and completion modal
│       └── admin.js           # Chart.js visualization, user CRUD, and maintenance timeline
└── README.md

<<<<<<< HEAD
---

## How to Run

### 1. Prerequisites
- Python 3.9+ installed on your system.

### 2. Setup and Installation
Clone the repository or navigate to the project directory:
```bash
git clone <your-repo-url>
cd Smart-Campus-Cleaning-and-Maintenance-Monitoring-System/backend
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

### 3. Start the Server
Run the Flask application:
```bash
python app.py
```

The database (`campus_maintenance.db`) will be automatically created and populated with demo accounts and sample maintenance records on first run.

### 4. Open in Browser
Open your web browser and navigate to:
```text
http://localhost:5000
```

---

## Demo Accounts
You can log in directly using the quick-fill buttons on the login screen or enter the credentials below:

| Role | Name | Username | Password | Default Landing Page |
|------|------|----------|----------|----------------------|
| **System Administrator** | System Administrator | `admin` | `admin123` | `http://localhost:5000/admin.html` |
| **Facility Supervisor** | Facility Supervisor | `supervisor` | `super123` | `http://localhost:5000/supervisor.html` |
| **Cleaning Staff 1** | Ramesh Kumar | `staff1` | `staff123` | `http://localhost:5000/staff.html` |
| **Maintenance Staff 2** | Sunita Sharma | `staff2` | `staff123` | `http://localhost:5000/staff.html` |
| **Student Reporter 1** | Alex Johnson | `reporter` | `report123` | `http://localhost:5000/report.html` |
| **Student Reporter 2** | Priya Sharma | `reporter2` | `report123` | `http://localhost:5000/report.html` |
| **Scholar Reporter 3** | David Chen | `reporter3` | `report123` | `http://localhost:5000/report.html` |
| **Campus Staff Reporter 4** | Amina Yusuf | `reporter4` | `report123` | `http://localhost:5000/report.html` |

---

## Role-Based Testing Checklist

### 1. Sign Up Walkthrough (New User Registration)
1. Navigate to `http://localhost:5000` (Login page).
2. Click **"Create account"** at the bottom of the sign-in card to open `signup.html`.
3. Try submitting with empty fields; verify inline error alerts prevent submission.
4. Try entering passwords that do not match or are fewer than 6 characters; notice the live match indicator.
5. Enter valid credentials:
   - **Full Name**: `Maya Patel`
   - **Username**: `mayap`
   - **Password**: `password123`
   - **Confirm Password**: `password123`
6. Click **Create Account**.
7. Verify the success notification appears with welcome message, and you are automatically redirected back to the login page.
8. Sign in with `mayap` / `password123` and verify you land on `report.html` with your account name and **REPORTER** badge.

### 2. Reporter Test Walkthrough
1. Log in as `reporter` / `report123` (or click the **Reporter** demo button).
2. You will be redirected to `report.html`.
3. Complete the form:
   - **Campus Zone / Area**: Select `College Building`
   - **Floor No**: Select `3`
   - **Room No**: Enter `Room 204 or Lab 3`
   - **Exact Location**: Enter `Near the water cooler, left side of the corridor`
   - **Category**: Select `Cleaning`
   - **Priority**: Select `High`
   - **Description**: Enter `Trash bin overflowing and liquid spilled near entrance.`
   - *(Optional)* Attach a test photo via the drag-and-drop zone.
4. Click **Submit Maintenance Report**.
5. Verify the success banner displays the created **Issue ID** (e.g., `#15`).
6. Scroll down to **My Submitted Reports** and confirm the newly reported issue displays the formatted location: `College Building, Floor 3, Room 204 or Lab 3, Near the water cooler, left side of the corridor`.
7. Click the **Timeline** button on the issue to inspect its audit log modal.
8. Click **Logout** in the topbar.

### 3. Supervisor Test Walkthrough
1. Log in as `supervisor` / `super123` (or click the **Supervisor** demo button).
2. You will be redirected to `supervisor.html`.
3. Check the summary metric cards at the top.
4. Test the **Zone** and **Floor** filters (e.g., select Zone `College Building`, Floor `3`).
5. Locate the newly reported issue in the task table. Notice the formatted location column.
6. In the **Assigned Staff** dropdown, select `Ramesh Kumar (Cleaning Staff)`.
7. Verify the confirmation toast appears and the status badge transitions from `Pending` to `Assigned`.
8. Change the priority dropdown to `Medium` and observe the instant update.
9. Click **Logout**.

### 4. Cleaning Staff Test Walkthrough
1. Log in as `staff1` / `staff123` (or click the **Staff 1** demo button).
2. You will be redirected to `staff.html`.
3. Confirm the assigned issue appears under your task queue showing the formatted location.
4. Click **Start Work**. Notice the status updates to `In Progress`.
5. Click **Mark Completed**. In the modal prompt, enter a completion note:
   - *"Emptied overflowing bin and mopped/sanitized floor area."*
6. Click **Submit & Mark Completed**.
7. Verify the task updates to `Completed` with the completion note displayed.
8. Click **Logout**.

### 5. Admin Test Walkthrough
1. Log in as `admin` / `admin123` (or click the **Admin** demo button).
2. You will be redirected to `admin.html`.
3. Verify the KPI cards reflect the latest counts and that the 3 **Chart.js** charts (Status, Category, Campus Zone) render dynamically. Notice the horizontal bar chart displays the six campus zones.
4. Use the **Zone** and **Floor** filters on the complete task registry table.
5. Scroll to **User Management** and click **Add New User**:
   - Fill in Name: `Kavita Rao`, Username: `kavitar`, Password: `password123`, Role: `staff`.
   - Submit and verify the user appears in the table.
6. Scroll to the **Campus Maintenance History Audit Log** to inspect the chronological timeline showing formatted locations for all actions.
7. Toggle between light and dark mode using the theme button in the topbar.
8. Click **Logout**.

---

## Team
- Member 1: `<name>`
- Member 2: `<name>`

## Working Together
1. Pull before you start: `git pull`
2. Make your changes
3. `git add .` then `git commit -m "message"` then `git push`

## License
For educational use (HMI course project).
=======


>>>>>>> f75342ee5cfdfb5c2af8f6408f42dced0d2d153a
