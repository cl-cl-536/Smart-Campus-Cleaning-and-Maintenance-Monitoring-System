/**
 * Smart Campus Cleaning and Maintenance Monitoring System
 * Common API client, Toast notification engine, Theme toggle, and Auth helpers.
 */

// Global state for current user
let currentUser = null;

/**
 * Perform authenticated API calls with automated JSON serialization and error parsing.
 */
async function apiFetch(endpoint, options = {}) {
  const defaultHeaders = {};
  
  // Set Content-Type only if body is NOT FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(endpoint, config);
    
    // Parse response
    let data = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      // If unauthorized and not on login page, redirect
      if (res.status === 401 && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.href = '/index.html';
        return;
      }
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

/**
 * Toast Notification System
 * type: 'success' | 'error' | 'info'
 */
function showToast(message, type = 'info', title = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const defaultTitles = {
    success: 'Success',
    error: 'Action Failed',
    info: 'Information'
  };

  const displayTitle = title || defaultTitles[type] || 'Notice';

  toast.innerHTML = `
    <i class="fas ${iconMap[type] || 'fa-info-circle'} toast-icon" style="font-size: 18px; margin-top: 2px;"></i>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(displayTitle)}</div>
      <div class="toast-msg">${escapeHtml(message)}</div>
    </div>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }, 4000);
}

/**
 * Confirmation Modal Helper
 */
function showConfirmModal({ title, message, confirmText = 'Confirm', confirmClass = 'btn-primary', onConfirm }) {
  let modalWrap = document.getElementById('global-confirm-modal');
  if (!modalWrap) {
    modalWrap = document.createElement('div');
    modalWrap.id = 'global-confirm-modal';
    modalWrap.className = 'modal-backdrop';
    modalWrap.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
          <button class="modal-close-btn" id="confirm-modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="confirm-modal-body">
          Are you sure?
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
          <button class="btn" id="confirm-modal-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrap);
  }

  const titleEl = document.getElementById('confirm-modal-title');
  const bodyEl = document.getElementById('confirm-modal-body');
  const okBtn = document.getElementById('confirm-modal-ok');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const closeBtn = document.getElementById('confirm-modal-close');

  titleEl.textContent = title;
  bodyEl.innerHTML = typeof message === 'string' ? `<p style="font-size: 14px; color: var(--text-muted);">${escapeHtml(message)}</p>` : '';
  if (typeof message !== 'string') {
    bodyEl.innerHTML = '';
    bodyEl.appendChild(message);
  }

  okBtn.textContent = confirmText;
  okBtn.className = `btn ${confirmClass}`;

  const closeModal = () => {
    modalWrap.classList.remove('active');
  };

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;

  okBtn.onclick = async () => {
    try {
      if (onConfirm) await onConfirm();
      closeModal();
    } catch (e) {
      console.error(e);
    }
  };

  modalWrap.classList.add('active');
}

/**
 * Authentication and Page Protection Check
 * @param {Array|string} allowedRoles 
 */
async function checkAuth(allowedRoles = []) {
  try {
    const data = await apiFetch('/api/auth/me');
    if (!data || !data.user) {
      window.location.href = '/index.html';
      return null;
    }

    currentUser = data.user;

    // Check roles if specified
    if (allowedRoles && allowedRoles.length > 0) {
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!rolesArray.includes(currentUser.role)) {
        showToast(`Your account (${currentUser.role}) does not have access to this page.`, 'error');
        // Redirect to their default page
        redirectToRoleHome(currentUser.role);
        return null;
      }
    }

    // Populate topbar if present
    updateTopBarUI(currentUser);
    return currentUser;
  } catch (err) {
    window.location.href = '/index.html';
    return null;
  }
}

/**
 * Redirect user to their respective dashboard
 */
function redirectToRoleHome(role) {
  switch (role) {
    case 'admin':
      window.location.href = '/admin.html';
      break;
    case 'supervisor':
      window.location.href = '/supervisor.html';
      break;
    case 'staff':
      window.location.href = '/staff.html';
      break;
    case 'reporter':
    default:
      window.location.href = '/report.html';
      break;
  }
}

/**
 * Populate Topbar Profile details
 */
function updateTopBarUI(user) {
  const userNameEl = document.getElementById('topbar-user-name');
  const userRoleEl = document.getElementById('topbar-user-role');
  const userAvatarEl = document.getElementById('topbar-user-avatar');

  if (userNameEl) userNameEl.textContent = user.name;
  if (userRoleEl) userRoleEl.textContent = user.role.toUpperCase();
  if (userAvatarEl) {
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    userAvatarEl.textContent = initial;
  }

  // Setup logout button
  const logoutBtns = document.querySelectorAll('.btn-logout, #logout-btn');
  logoutBtns.forEach(btn => {
    btn.onclick = logoutUser;
  });

  // Setup mobile sidebar toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.app-sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (menuBtn && sidebar) {
    menuBtn.onclick = () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('active');
    };
    if (backdrop) {
      backdrop.onclick = () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      };
    }
  }
}

/**
 * Logout User
 */
async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 400);
  } catch (e) {
    window.location.href = '/index.html';
  }
}

/**
 * Dark / Light Theme Manager
 */
function initTheme() {
  const savedTheme = localStorage.getItem('sc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
  toggleBtns.forEach(btn => {
    btn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sc_theme', next);
      updateThemeIcon(next);
    };
  });
}

function updateThemeIcon(theme) {
  const icons = document.querySelectorAll('.theme-toggle-btn i');
  icons.forEach(icon => {
    if (theme === 'dark') {
      icon.className = 'fas fa-sun';
    } else {
      icon.className = 'fas fa-moon';
    }
  });
}

/**
 * Badge generators for consistent UI rendering
 */
function getStatusBadge(status) {
  const cleanStatus = (status || 'Pending').toLowerCase().replace(/\s+/g, '');
  return `<span class="badge badge-status-${cleanStatus}"><span class="badge-dot"></span>${escapeHtml(status || 'Pending')}</span>`;
}

function getPriorityBadge(priority) {
  const p = (priority || 'Medium').toLowerCase();
  const icon = p === 'high' ? 'fa-fire' : (p === 'medium' ? 'fa-exclamation' : 'fa-arrow-down');
  return `<span class="badge badge-prio-${p}"><i class="fas ${icon}" style="font-size: 10px;"></i> ${escapeHtml(priority || 'Medium')}</span>`;
}

function getCategoryBadge(category) {
  const catIcons = {
    'Cleaning': 'fa-broom',
    'Electrical': 'fa-bolt',
    'Plumbing': 'fa-faucet-drip',
    'Furniture': 'fa-chair',
    'Other': 'fa-wrench'
  };
  const icon = catIcons[category] || 'fa-tag';
  return `<span class="badge badge-category"><i class="fas ${icon}" style="font-size: 11px;"></i> ${escapeHtml(category || 'Other')}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  // SQLite format YYYY-MM-DD HH:MM:SS
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const CAMPUS_ZONES = [
  'College Building',
  'Euphoria Stairs',
  'Canteen',
  'Open Canteen',
  'Samvad',
  'Backcourt'
];

const CAMPUS_FLOORS = [
  'Ground',
  '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

const OUTDOOR_CAMPUS_ZONES = [
  'Euphoria Stairs',
  'Open Canteen',
  'Backcourt'
];

/**
 * Formats location according to required specification:
 * "Zone, Floor X, Room, Exact location"
 */
function formatLocation(issue) {
  if (!issue) return '';
  const parts = [];
  if (issue.zone) parts.push(issue.zone);
  if (issue.floor !== undefined && issue.floor !== null && issue.floor !== '') {
    parts.push(`Floor ${issue.floor}`);
  }
  if (issue.room && issue.room.trim()) {
    parts.push(issue.room.trim());
  }
  if (issue.exact_location && issue.exact_location.trim()) {
    parts.push(issue.exact_location.trim());
  }
  return parts.join(', ');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Auto initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});
