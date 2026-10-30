# Smart Campus Cleaning and Maintenance Monitoring System

An HMI (Human-Machine Interaction) project that replaces manual cleaning registers with a simple, central web system for campus cleaning and maintenance.

## Problem
Cleaning and maintenance in classrooms, labs, washrooms and corridors is hard to track with paper registers. This system lets people report issues, supervisors assign work, staff update progress, and admins watch everything on one dashboard.

##  User Roles
| Role | What they can do |
|------|------------------|
| **Reporter** (student/staff) | Report an issue, track their own reports |
| **Supervisor** | View all issues, assign them to cleaning staff, set priority |
| **Cleaning Staff** | See assigned tasks, mark In Progress / Completed, add a note |
| **Admin** | See the full dashboard, statistics, history, manage users |

## Features
- Login with role-based access
- Report an issue (location, building, room, category, description, priority, optional photo)
- Supervisor dashboard to assign and track tasks
- Cleaning staff dashboard to update task status
- Admin dashboard with counts and charts (total, pending, in progress, completed, high priority)
- Maintenance history (who did what and when)
- Search and filter by status, priority, category
- Clean, responsive, easy-to-use interface

##  Workflow
Report Issue → Supervisor Reviews → Staff Assigned → In Progress → Completed → Admin Monitors

##  Tech Stack
| Part | Technology |
|------|------------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python Flask |
| Database | SQLite |
| Version control | Git and GitHub |

##  Project Structure
Smart-Campus-Cleaning-and-Maintenance-Monitoring-System/
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── requirements.txt
│   └── uploads/
├── frontend/
│   ├── index.html          (login)
│   ├── report.html
│   ├── supervisor.html
│   ├── staff.html
│   ├── admin.html
│   ├── css/style.css
│   └── js/ (api.js, auth.js, report.js, supervisor.js, staff.js, admin.js)
└── README.md
```

## How to Run
git clone <your-repo-url>
cd Smart-Campus-Cleaning-and-Maintenance-Monitoring-System/backend
pip install -r requirements.txt
python app.py

Then open **http://localhost:5000** in your browser.

## Demo Accounts
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Supervisor | supervisor | super123 |
| Cleaning Staff | staff1 | staff123 |
| Reporter | reporter | report123 |

## Team
- Member 1: <name>
- Member 2: <name>

##  Working Together
1. Pull before you start: `git pull`
2. Make your changes
3. `git add .` then `git commit -m "message"` then `git push`

## License
For educational use (HMI course project).
