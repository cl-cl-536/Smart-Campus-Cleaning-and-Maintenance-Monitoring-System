"""
Smart Campus Cleaning and Maintenance Monitoring System
Flask Application serving frontend static/HTML files and RESTful APIs.
"""

import os
import uuid
from functools import wraps
from datetime import datetime
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask import (
    Flask, request, jsonify, session, send_from_directory, abort
)
from database import get_db, init_db, VALID_ZONES, VALID_FLOORS, OUTDOOR_ZONES

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')

os.makedirs(UPLOADS_DIR, exist_ok=True)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'smart-campus-hmi-secret-key-2026')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}


def allowed_file(filename):
    """Check if uploaded file has an allowed image extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# -------------------------------------------------------------
# Role-based Access Control (RBAC) Decorators
# -------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function


def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Authentication required. Please log in.'}), 401
            current_role = session.get('role')
            if current_role not in allowed_roles:
                return jsonify({'error': f'Access forbidden. Requires one of: {", ".join(allowed_roles)}'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# -------------------------------------------------------------
# Static & Page Serving Routes
# -------------------------------------------------------------
@app.route('/')
@app.route('/index.html')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/report')
@app.route('/report.html')
def serve_report():
    return send_from_directory(FRONTEND_DIR, 'report.html')


@app.route('/supervisor')
@app.route('/supervisor.html')
def serve_supervisor():
    return send_from_directory(FRONTEND_DIR, 'supervisor.html')


@app.route('/staff')
@app.route('/staff.html')
def serve_staff():
    return send_from_directory(FRONTEND_DIR, 'staff.html')


@app.route('/admin')
@app.route('/admin.html')
def serve_admin():
    return send_from_directory(FRONTEND_DIR, 'admin.html')


@app.route('/signup')
@app.route('/signup.html')
def serve_signup():
    return send_from_directory(FRONTEND_DIR, 'signup.html')


@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)


@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)


# -------------------------------------------------------------
# Authentication Endpoints
# -------------------------------------------------------------
@app.route('/api/signup', methods=['POST'])
def api_signup():
    """
    Public signup endpoint for new Reporter accounts.
    Strictly creates accounts with role='reporter'.
    """
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()
    confirm_password = data.get('confirm_password', '').strip()

    # 1. Validation: required fields
    if not name or not username or not password or not confirm_password:
        return jsonify({'error': 'Please fill in all fields (Full Name, Username, Password, and Confirm Password).'}), 400

    # 2. Validation: username length
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters long.'}), 400

    if len(username) > 30:
        return jsonify({'error': 'Username cannot exceed 30 characters.'}), 400

    # 3. Validation: password length
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    # 4. Validation: password confirmation match
    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match. Please verify and re-enter.'}), 400

    # 5. Check if username is already taken
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?;", (username,))
    existing_user = cursor.fetchone()

    if existing_user:
        conn.close()
        return jsonify({'error': f'The username "{username}" is already taken. Please choose another username.'}), 409

    # 6. Insert new user strictly as role 'reporter'
    role = 'reporter'
    pw_hash = generate_password_hash(password)

    cursor.execute("""
        INSERT INTO users (name, username, password_hash, role)
        VALUES (?, ?, ?, ?);
    """, (name, username, pw_hash, role))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'message': 'Account created successfully! You can now sign in.',
        'user': {
            'id': user_id,
            'name': name,
            'username': username,
            'role': role
        }
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?;", (username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid username or password. Please try again.'}), 401

    session['user_id'] = user['id']
    session['username'] = user['username']
    session['name'] = user['name']
    session['role'] = user['role']

    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user['id'],
            'name': user['name'],
            'username': user['username'],
            'role': user['role']
        }
    }), 200


@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/auth/me', methods=['GET'])
def api_current_user():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, username, role FROM users WHERE id = ?;", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()

    if not user:
        session.clear()
        return jsonify({'error': 'User not found'}), 401

    return jsonify({
        'user': {
            'id': user['id'],
            'name': user['name'],
            'username': user['username'],
            'role': user['role']
        }
    }), 200


# -------------------------------------------------------------
# Issues Endpoints
# -------------------------------------------------------------
@app.route('/api/issues', methods=['GET'])
@login_required
def get_issues():
    """
    Returns issues filtered by role and optional query parameters:
    - Admin / Supervisor: sees all issues
    - Staff: sees issues assigned to them
    - Reporter: sees issues reported by them
    """
    user_id = session['user_id']
    role = session['role']

    status_filter = request.args.get('status')
    priority_filter = request.args.get('priority')
    category_filter = request.args.get('category')
    zone_filter = request.args.get('zone')
    floor_filter = request.args.get('floor')
    search_query = request.args.get('search')

    query = """
        SELECT 
            i.id, i.zone, i.floor, i.room, i.exact_location, i.category,
            i.description, i.priority, i.photo_path, i.status,
            i.reported_by, i.assigned_to, i.completion_note,
            i.created_at, i.updated_at,
            reporter.name AS reporter_name,
            reporter.username AS reporter_username,
            assignee.name AS assignee_name,
            assignee.username AS assignee_username
        FROM issues i
        LEFT JOIN users reporter ON i.reported_by = reporter.id
        LEFT JOIN users assignee ON i.assigned_to = assignee.id
        WHERE 1=1
    """
    params = []

    # Enforce role-based scoping
    if role == 'staff':
        query += " AND i.assigned_to = ?"
        params.append(user_id)
    elif role == 'reporter':
        query += " AND i.reported_by = ?"
        params.append(user_id)

    # Optional filters
    if status_filter and status_filter.lower() != 'all':
        query += " AND i.status = ?"
        params.append(status_filter)

    if priority_filter and priority_filter.lower() != 'all':
        query += " AND i.priority = ?"
        params.append(priority_filter)

    if category_filter and category_filter.lower() != 'all':
        query += " AND i.category = ?"
        params.append(category_filter)

    if zone_filter and zone_filter.lower() != 'all':
        query += " AND i.zone = ?"
        params.append(zone_filter)

    if floor_filter and floor_filter.lower() != 'all':
        query += " AND i.floor = ?"
        params.append(floor_filter)

    if search_query:
        query += """ AND (
            i.description LIKE ? OR 
            i.zone LIKE ? OR 
            i.floor LIKE ? OR 
            i.room LIKE ? OR
            i.exact_location LIKE ? OR
            reporter.name LIKE ? OR
            assignee.name LIKE ?
        )"""
        search_pattern = f"%{search_query.strip()}%"
        params.extend([search_pattern] * 7)

    query += " ORDER BY i.created_at DESC"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    issues_list = [dict(row) for row in rows]
    return jsonify({'issues': issues_list, 'count': len(issues_list)}), 200


@app.route('/api/issues', methods=['POST'])
@login_required
def create_issue():
    """Create a new issue with optional photo upload."""
    user_id = session['user_id']
    user_name = session['name']

    # Support form submissions (multipart or urlencoded) and JSON
    if request.form:
        zone = request.form.get('zone', '').strip()
        floor = request.form.get('floor', '').strip()
        room = request.form.get('room', '').strip()
        exact_location = request.form.get('exact_location', '').strip()
        category = request.form.get('category', '').strip()
        description = request.form.get('description', '').strip()
        priority = request.form.get('priority', 'Medium').strip()
    else:
        data = request.get_json(silent=True) or {}
        zone = data.get('zone', '').strip()
        floor = data.get('floor', '').strip()
        room = data.get('room', '').strip()
        exact_location = data.get('exact_location', '').strip()
        category = data.get('category', '').strip()
        description = data.get('description', '').strip()
        priority = data.get('priority', 'Medium').strip()

    # Form validation: Zone
    if not zone or zone not in VALID_ZONES:
        return jsonify({'error': f'Please select a valid Campus Zone (Options: {", ".join(VALID_ZONES)}).'}), 400

    # Form validation: Floor
    if not floor or floor not in VALID_FLOORS:
        return jsonify({'error': f'Please select a valid Floor No (Options: {", ".join(VALID_FLOORS)}).'}), 400

    # Form validation: Exact Location
    if not exact_location:
        return jsonify({'error': 'Exact Location is required (e.g. "Near the water cooler, left side of the corridor").'}), 400

    # Room number validation: mandatory for indoor areas, optional for outdoor zones
    if zone not in OUTDOOR_ZONES and not room:
        return jsonify({'error': f'Room No is required for indoor zone "{zone}". (e.g. "Room 204 or Lab 3").'}), 400

    # Form validation: Category
    if category not in ('Cleaning', 'Electrical', 'Plumbing', 'Furniture', 'Other'):
        return jsonify({'error': 'Please select a valid issue category.'}), 400

    # Form validation: Description
    if not description:
        return jsonify({'error': 'Please provide a detailed description of the maintenance issue.'}), 400

    if priority not in ('Low', 'Medium', 'High'):
        priority = 'Medium'

    # Handle photo upload
    photo_path = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename != '':
            if allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4().hex}_{int(datetime.now().timestamp())}.{ext}"
                save_dest = os.path.join(UPLOADS_DIR, unique_filename)
                file.save(save_dest)
                photo_path = f"/uploads/{unique_filename}"
            else:
                return jsonify({'error': 'Invalid image type. Allowed: PNG, JPG, JPEG, WEBP, GIF.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO issues (
            zone, floor, room, exact_location, category, description,
            priority, photo_path, status, reported_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    """, (zone, floor, room, exact_location, category, description, priority, photo_path, user_id))
    issue_id = cursor.lastrowid

    # Add history log
    action_log = f"Issue reported by {user_name} (Priority: {priority})"
    cursor.execute("""
        INSERT INTO history (issue_id, action, performed_by, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP);
    """, (issue_id, action_log, user_id))

    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Issue reported successfully!',
        'issue_id': issue_id,
        'status': 'Pending'
    }), 201


@app.route('/api/issues/<int:issue_id>', methods=['GET'])
@login_required
def get_issue_detail(issue_id):
    """Retrieve issue detail along with full maintenance history timeline."""
    user_id = session['user_id']
    role = session['role']

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            i.id, i.zone, i.floor, i.room, i.exact_location, i.category,
            i.description, i.priority, i.photo_path, i.status,
            i.reported_by, i.assigned_to, i.completion_note,
            i.created_at, i.updated_at,
            reporter.name AS reporter_name,
            assignee.name AS assignee_name
        FROM issues i
        LEFT JOIN users reporter ON i.reported_by = reporter.id
        LEFT JOIN users assignee ON i.assigned_to = assignee.id
        WHERE i.id = ?;
    """, (issue_id,))
    issue = cursor.fetchone()

    if not issue:
        conn.close()
        return jsonify({'error': 'Issue not found'}), 404

    # Authorization check
    if role == 'reporter' and issue['reported_by'] != user_id:
        conn.close()
        return jsonify({'error': 'Access denied to this issue'}), 403
    if role == 'staff' and issue['assigned_to'] != user_id:
        conn.close()
        return jsonify({'error': 'Access denied to this task'}), 403

    # Fetch history timeline
    cursor.execute("""
        SELECT h.id, h.action, h.timestamp, u.name as performed_by_name, u.role as performed_by_role
        FROM history h
        LEFT JOIN users u ON h.performed_by = u.id
        WHERE h.issue_id = ?
        ORDER BY h.timestamp ASC;
    """, (issue_id,))
    history_rows = cursor.fetchall()
    conn.close()

    return jsonify({
        'issue': dict(issue),
        'history': [dict(h) for h in history_rows]
    }), 200


@app.route('/api/issues/<int:issue_id>/assign', methods=['PATCH'])
@roles_required('admin', 'supervisor')
def assign_issue(issue_id):
    """Assign an issue to a staff member and update status from Pending to Assigned."""
    data = request.get_json(silent=True) or {}
    staff_id = data.get('assigned_to')

    if not staff_id:
        return jsonify({'error': 'Please select a staff member to assign.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Validate staff user
    cursor.execute("SELECT id, name, role FROM users WHERE id = ? AND role = 'staff';", (staff_id,))
    staff = cursor.fetchone()
    if not staff:
        conn.close()
        return jsonify({'error': 'Selected user is not an active staff member.'}), 400

    # Check issue
    cursor.execute("SELECT status FROM issues WHERE id = ?;", (issue_id,))
    issue = cursor.fetchone()
    if not issue:
        conn.close()
        return jsonify({'error': 'Issue not found'}), 404

    # Determine status: if Pending, transition to Assigned; if already In Progress, keep it
    new_status = 'Assigned' if issue['status'] == 'Pending' else issue['status']

    cursor.execute("""
        UPDATE issues
        SET assigned_to = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
    """, (staff_id, new_status, issue_id))

    action_text = f"Assigned to {staff['name']} by {session['name']}"
    cursor.execute("""
        INSERT INTO history (issue_id, action, performed_by, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP);
    """, (issue_id, action_text, session['user_id']))

    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Issue #{issue_id} successfully assigned to {staff["name"]}',
        'assigned_to': staff_id,
        'assignee_name': staff['name'],
        'status': new_status
    }), 200


@app.route('/api/issues/<int:issue_id>/priority', methods=['PATCH'])
@roles_required('admin', 'supervisor')
def update_priority(issue_id):
    """Change priority of an issue."""
    data = request.get_json(silent=True) or {}
    priority = data.get('priority')

    if priority not in ('Low', 'Medium', 'High'):
        return jsonify({'error': 'Priority must be Low, Medium, or High.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT priority FROM issues WHERE id = ?;", (issue_id,))
    issue = cursor.fetchone()
    if not issue:
        conn.close()
        return jsonify({'error': 'Issue not found'}), 404

    cursor.execute("""
        UPDATE issues
        SET priority = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
    """, (priority, issue_id))

    action_text = f"Priority changed from {issue['priority']} to {priority} by {session['name']}"
    cursor.execute("""
        INSERT INTO history (issue_id, action, performed_by, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP);
    """, (issue_id, action_text, session['user_id']))

    conn.commit()
    conn.close()

    return jsonify({'message': f'Priority updated to {priority}', 'priority': priority}), 200


@app.route('/api/issues/<int:issue_id>/status', methods=['PATCH'])
@login_required
def update_status(issue_id):
    """
    Update the status of an issue.
    - Staff can update only their assigned tasks to 'In Progress' or 'Completed' (with completion note)
    - Supervisor & Admin can update any status
    Status flow: Pending -> Assigned -> In Progress -> Completed
    """
    user_id = session['user_id']
    role = session['role']
    user_name = session['name']

    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    completion_note = data.get('completion_note', '').strip()

    valid_statuses = ('Pending', 'Assigned', 'In Progress', 'Completed')
    if new_status not in valid_statuses:
        return jsonify({'error': f'Status must be one of: {", ".join(valid_statuses)}'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM issues WHERE id = ?;", (issue_id,))
    issue = cursor.fetchone()
    if not issue:
        conn.close()
        return jsonify({'error': 'Issue not found'}), 404

    # Staff checks
    if role == 'staff':
        if issue['assigned_to'] != user_id:
            conn.close()
            return jsonify({'error': 'You can only update tasks assigned to you.'}), 403
        if new_status not in ('In Progress', 'Completed'):
            conn.close()
            return jsonify({'error': 'Staff can only set status to In Progress or Completed.'}), 400

    # If completing, require completion note if provided or default
    note_to_save = completion_note if completion_note else issue['completion_note']

    cursor.execute("""
        UPDATE issues
        SET status = ?, completion_note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
    """, (new_status, note_to_save, issue_id))

    if new_status == 'Completed' and completion_note:
        action_text = f"Task marked Completed by {user_name}. Note: {completion_note}"
    else:
        action_text = f"Status changed to {new_status} by {user_name}"

    cursor.execute("""
        INSERT INTO history (issue_id, action, performed_by, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP);
    """, (issue_id, action_text, user_id))

    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Issue #{issue_id} status updated to {new_status}',
        'status': new_status,
        'completion_note': note_to_save
    }), 200


# -------------------------------------------------------------
# Staff List Endpoint
# -------------------------------------------------------------
@app.route('/api/staff', methods=['GET'])
@roles_required('admin', 'supervisor')
def get_staff_list():
    """Returns a list of all registered cleaning and maintenance staff."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, username FROM users WHERE role = 'staff' ORDER BY name ASC;")
    staff_members = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'staff': staff_members}), 200


# -------------------------------------------------------------
# Statistics & Analytics Endpoint
# -------------------------------------------------------------
@app.route('/api/statistics', methods=['GET'])
@roles_required('admin', 'supervisor')
def get_statistics():
    """Returns aggregate metrics and category/status/location breakdowns."""
    conn = get_db()
    cursor = conn.cursor()

    # Status summary
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as assigned,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN priority = 'High' AND status != 'Completed' THEN 1 ELSE 0 END) as high_priority
        FROM issues;
    """)
    summary = dict(cursor.fetchone() or {})

    # Issues by Category
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM issues
        GROUP BY category
        ORDER BY count DESC;
    """)
    by_category = [dict(r) for r in cursor.fetchall()]

    # Issues by Status
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM issues
        GROUP BY status;
    """)
    by_status = [dict(r) for r in cursor.fetchall()]

    # Issues by Campus Zone
    cursor.execute("""
        SELECT zone, COUNT(*) as count
        FROM issues
        GROUP BY zone
        ORDER BY count DESC;
    """)
    by_zone = [dict(r) for r in cursor.fetchall()]

    # Issues by Priority
    cursor.execute("""
        SELECT priority, COUNT(*) as count
        FROM issues
        GROUP BY priority;
    """)
    by_priority = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        'summary': {
            'total': summary.get('total') or 0,
            'pending': summary.get('pending') or 0,
            'assigned': summary.get('assigned') or 0,
            'in_progress': summary.get('in_progress') or 0,
            'completed': summary.get('completed') or 0,
            'high_priority': summary.get('high_priority') or 0
        },
        'by_category': by_category,
        'by_status': by_status,
        'by_zone': by_zone,
        'by_location': by_zone,
        'by_priority': by_priority
    }), 200


# -------------------------------------------------------------
# Maintenance History Timeline Endpoint
# -------------------------------------------------------------
@app.route('/api/history', methods=['GET'])
@roles_required('admin', 'supervisor')
def get_global_history():
    """Retrieve global maintenance action log."""
    limit = request.args.get('limit', 100, type=int)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            h.id, h.issue_id, h.action, h.timestamp,
            u.name as performed_by_name, u.role as performed_by_role,
            i.zone, i.floor, i.room, i.exact_location, i.category, i.priority, i.status
        FROM history h
        LEFT JOIN users u ON h.performed_by = u.id
        LEFT JOIN issues i ON h.issue_id = i.id
        ORDER BY h.timestamp DESC
        LIMIT ?;
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    return jsonify({'history': [dict(r) for r in rows]}), 200


# -------------------------------------------------------------
# User Management Endpoints (Admin Only)
# -------------------------------------------------------------
@app.route('/api/users', methods=['GET'])
@roles_required('admin')
def get_users():
    """List all registered users (excluding password hashes)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, username, role, created_at FROM users ORDER BY created_at DESC;")
    users = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'users': users}), 200


@app.route('/api/users', methods=['POST'])
@roles_required('admin')
def create_user():
    """Create a new user account."""
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()
    role = data.get('role', '').strip().lower()

    if not (name and username and password and role):
        return jsonify({'error': 'Name, username, password, and role are all required.'}), 400

    if role not in ('admin', 'supervisor', 'staff', 'reporter'):
        return jsonify({'error': 'Role must be admin, supervisor, staff, or reporter.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        pw_hash = generate_password_hash(password)
        cursor.execute("""
            INSERT INTO users (name, username, password_hash, role)
            VALUES (?, ?, ?, ?);
        """, (name, username, pw_hash, role))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return jsonify({
            'message': f'User "{username}" created successfully.',
            'user': {'id': user_id, 'name': name, 'username': username, 'role': role}
        }), 201
    except Exception as e:
        conn.close()
        if 'UNIQUE constraint failed' in str(e):
            return jsonify({'error': f'Username "{username}" is already taken.'}), 409
        return jsonify({'error': 'Database error while creating user.'}), 500


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@roles_required('admin')
def delete_user(user_id):
    """Delete a user account (cannot delete own account)."""
    if user_id == session['user_id']:
        return jsonify({'error': 'You cannot delete your own admin account.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT username, role FROM users WHERE id = ?;", (user_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        return jsonify({'error': 'User not found.'}), 404

    # If deleting staff, unassign their issues
    cursor.execute("UPDATE issues SET assigned_to = NULL WHERE assigned_to = ?;", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?;", (user_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': f'User "{target["username"]}" deleted successfully.'}), 200


# -------------------------------------------------------------
# Initialize DB and Main Entrypoint
# -------------------------------------------------------------
init_db()

if __name__ == '__main__':
    print("=" * 60)
    print("  Smart Campus Cleaning & Maintenance Monitoring System")
    print("  Server running at: http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
