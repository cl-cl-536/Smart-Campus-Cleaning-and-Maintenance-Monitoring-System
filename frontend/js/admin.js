/**
 * Smart Campus Cleaning & Maintenance Monitoring System
 * Admin Command Center Logic: Analytics, Task Registry, User Management & Global History
 */

let chartStatusInstance = null;
let chartCategoryInstance = null;
let chartZoneInstance = null;
let searchDebounce = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Protect page: admin role only
  const user = await checkAuth('admin');
  if (!user) return;

  // Initialize and load everything
  await loadAdminStatsAndCharts();
  await loadAdminTasks();
  await loadUsersList();
  await loadGlobalHistory();

  // Setup event listeners
  initAdminEventListeners();
});

/**
 * Event Listeners for Filters, Modals, and Navigation
 */
function initAdminEventListeners() {
  // Chart & Stats refresh
  const refAnalytics = document.getElementById('btn-refresh-analytics');
  if (refAnalytics) refAnalytics.onclick = () => loadAdminStatsAndCharts();

  // Task Filters
  const fSearch = document.getElementById('admin-filter-search');
  const fZone = document.getElementById('admin-filter-zone');
  const fFloor = document.getElementById('admin-filter-floor');
  const fStatus = document.getElementById('admin-filter-status');
  const fPriority = document.getElementById('admin-filter-priority');
  const fCategory = document.getElementById('admin-filter-category');
  const fReset = document.getElementById('admin-btn-reset-filters');

  if (fSearch) {
    fSearch.oninput = () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => loadAdminTasks(), 300);
    };
  }

  if (fZone) fZone.onchange = () => loadAdminTasks();
  if (fFloor) fFloor.onchange = () => loadAdminTasks();
  if (fStatus) fStatus.onchange = () => loadAdminTasks();
  if (fPriority) fPriority.onchange = () => loadAdminTasks();
  if (fCategory) fCategory.onchange = () => loadAdminTasks();

  if (fReset) {
    fReset.onclick = () => {
      if (fSearch) fSearch.value = '';
      if (fZone) fZone.value = 'all';
      if (fFloor) fFloor.value = 'all';
      if (fStatus) fStatus.value = 'all';
      if (fPriority) fPriority.value = 'all';
      if (fCategory) fCategory.value = 'all';
      loadAdminTasks();
    };
  }

  // History Refresh
  const refHistory = document.getElementById('btn-refresh-history');
  if (refHistory) refHistory.onclick = () => loadGlobalHistory();

  // User Management Modal
  const createUserModal = document.getElementById('create-user-modal');
  const openCreateUserBtn = document.getElementById('btn-open-create-user');
  const closeCreateUserBtns = [
    document.getElementById('create-user-close'),
    document.getElementById('create-user-cancel')
  ];
  const createUserForm = document.getElementById('create-user-form');

  if (openCreateUserBtn) {
    openCreateUserBtn.onclick = () => {
      createUserForm.reset();
      createUserModal.classList.add('active');
    };
  }

  closeCreateUserBtns.forEach(btn => {
    if (btn) btn.onclick = () => createUserModal.classList.remove('active');
  });

  if (createUserForm) {
    createUserForm.onsubmit = handleCreateUser;
  }

  // Task Detail Modal
  const detailModal = document.getElementById('detail-modal');
  const closeDetailBtns = [
    document.getElementById('modal-detail-close'),
    document.getElementById('modal-detail-close-btn')
  ];
  closeDetailBtns.forEach(btn => {
    if (btn) btn.onclick = () => detailModal.classList.remove('active');
  });
}

/**
 * Load Summary Statistics and Render Chart.js Analytics
 */
async function loadAdminStatsAndCharts() {
  try {
    const data = await apiFetch('/api/statistics');
    const s = data.summary || {};

    // Populate Counters
    document.getElementById('admin-stat-total').textContent = s.total || 0;
    document.getElementById('admin-stat-pending').textContent = s.pending || 0;
    document.getElementById('admin-stat-inprogress').textContent = s.in_progress || 0;
    document.getElementById('admin-stat-completed').textContent = s.completed || 0;
    document.getElementById('admin-stat-high').textContent = s.high_priority || 0;

    // Render Charts
    renderStatusChart(data.by_status || []);
    renderCategoryChart(data.by_category || []);
    renderZoneChart(data.by_zone || []);

  } catch (err) {
    console.error('Error loading admin statistics:', err);
    showToast('Failed to load statistics: ' + err.message, 'error');
  }
}

/**
 * 1. Issues by Status (Doughnut Chart)
 */
function renderStatusChart(statusData) {
  const canvas = document.getElementById('chart-status');
  if (!canvas) return;

  const statusOrder = ['Pending', 'Assigned', 'In Progress', 'Completed'];
  const colorMap = {
    'Pending': '#64748b',
    'Assigned': '#6366f1',
    'In Progress': '#d97706',
    'Completed': '#059669'
  };

  const labels = [];
  const counts = [];
  const colors = [];

  statusOrder.forEach(st => {
    const found = statusData.find(item => item.status === st);
    labels.push(st);
    counts.push(found ? found.count : 0);
    colors.push(colorMap[st]);
  });

  if (chartStatusInstance) chartStatusInstance.destroy();

  const ctx = canvas.getContext('2d');
  chartStatusInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: 'var(--bg-surface)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
          }
        }
      },
      cutout: '65%'
    }
  });
}

/**
 * 2. Issues by Category (Bar Chart)
 */
function renderCategoryChart(categoryData) {
  const canvas = document.getElementById('chart-category');
  if (!canvas) return;

  const categories = ['Cleaning', 'Electrical', 'Plumbing', 'Furniture', 'Other'];
  const counts = categories.map(cat => {
    const found = categoryData.find(item => item.category === cat);
    return found ? found.count : 0;
  });

  if (chartCategoryInstance) chartCategoryInstance.destroy();

  const ctx = canvas.getContext('2d');
  chartCategoryInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Issues Count',
        data: counts,
        backgroundColor: [
          '#0d9488', // Cleaning
          '#eab308', // Electrical
          '#0284c7', // Plumbing
          '#8b5cf6', // Furniture
          '#64748b'  // Other
        ],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        }
      }
    }
  });
}

/**
 * 3. Issues by Campus Zone (Horizontal Bar Chart)
 * Exactly the 6 zones: College Building, Euphoria Stairs, Canteen, Open Canteen, Samvad, Backcourt
 */
function renderZoneChart(zoneData) {
  const canvas = document.getElementById('chart-zone');
  if (!canvas) return;

  const zones = [
    'College Building',
    'Euphoria Stairs',
    'Canteen',
    'Open Canteen',
    'Samvad',
    'Backcourt'
  ];

  const counts = zones.map(z => {
    const found = zoneData.find(item => item.zone === z);
    return found ? found.count : 0;
  });

  const zoneColors = [
    '#0284c7', // College Building - Sky Blue
    '#0d9488', // Euphoria Stairs - Teal
    '#f59e0b', // Canteen - Amber
    '#10b981', // Open Canteen - Emerald
    '#8b5cf6', // Samvad - Purple
    '#64748b'  // Backcourt - Slate
  ];

  if (chartZoneInstance) chartZoneInstance.destroy();

  const ctx = canvas.getContext('2d');
  chartZoneInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: zones,
      datasets: [{
        label: 'Total Issues',
        data: counts,
        backgroundColor: zoneColors,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        }
      }
    }
  });
}

/**
 * Load and Render Tasks Registry Table
 */
async function loadAdminTasks() {
  const loading = document.getElementById('admin-issues-loading');
  const wrap = document.getElementById('admin-issues-table-wrap');
  const tbody = document.getElementById('admin-issues-tbody');
  const empty = document.getElementById('admin-issues-empty');
  const countBadge = document.getElementById('admin-issues-count');

  if (loading) loading.style.display = 'block';
  if (wrap) wrap.style.display = 'none';
  if (empty) empty.style.display = 'none';

  const zone = (document.getElementById('admin-filter-zone') || {}).value;
  const floor = (document.getElementById('admin-filter-floor') || {}).value;
  const status = document.getElementById('admin-filter-status').value;
  const priority = document.getElementById('admin-filter-priority').value;
  const category = document.getElementById('admin-filter-category').value;
  const search = document.getElementById('admin-filter-search').value.trim();

  const params = new URLSearchParams();
  if (zone && zone !== 'all') params.append('zone', zone);
  if (floor && floor !== 'all') params.append('floor', floor);
  if (status && status !== 'all') params.append('status', status);
  if (priority && priority !== 'all') params.append('priority', priority);
  if (category && category !== 'all') params.append('category', category);
  if (search) params.append('search', search);

  try {
    const data = await apiFetch(`/api/issues?${params.toString()}`);
    const issues = data.issues || [];

    if (loading) loading.style.display = 'none';
    if (countBadge) countBadge.textContent = `${issues.length} task${issues.length === 1 ? '' : 's'}`;

    if (issues.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }

    if (tbody) {
      tbody.innerHTML = issues.map(task => `
        <tr>
          <td><span class="issue-id-tag">#${task.id}</span></td>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 13px; line-height: 1.4;">
              ${escapeHtml(formatLocation(task))}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; max-width: 320px; white-space: normal;">
              ${escapeHtml(task.description)}
            </div>
          </td>
          <td>${getCategoryBadge(task.category)}</td>
          <td>${getPriorityBadge(task.priority)}</td>
          <td>${getStatusBadge(task.status)}</td>
          <td>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-main);">
              ${task.assignee_name ? escapeHtml(task.assignee_name) : '<span style="color: var(--text-subtle);">Unassigned</span>'}
            </div>
          </td>
          <td>
            <div style="font-size: 12px; font-weight: 600; color: var(--text-main);">${escapeHtml(task.reporter_name || 'Reporter')}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${formatDate(task.created_at)}</div>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="openAdminIssueDetail(${task.id})">
              <i class="fas fa-eye"></i> Audit
            </button>
          </td>
        </tr>
      `).join('');

      if (wrap) wrap.style.display = 'block';
    }
  } catch (err) {
    if (loading) loading.style.display = 'none';
    showToast('Failed to load tasks: ' + err.message, 'error');
  }
}

/**
 * Load and Render Users Table
 */
async function loadUsersList() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  try {
    const data = await apiFetch('/api/users');
    const users = data.users || [];

    const roleBadgeMap = {
      admin: '<span class="badge" style="background: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8;">Admin</span>',
      supervisor: '<span class="badge" style="background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe;">Supervisor</span>',
      staff: '<span class="badge" style="background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4;">Cleaning Staff</span>',
      reporter: '<span class="badge" style="background: #f8fafc; color: #475569; border: 1px solid #cbd5e1;">Reporter</span>'
    };

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar" style="width: 28px; height: 28px; font-size: 11px;">
              ${u.name.charAt(0).toUpperCase()}
            </div>
            <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(u.name)}</span>
          </div>
        </td>
        <td><code style="font-family: var(--font-mono); font-size: 12px;">@${escapeHtml(u.username)}</code></td>
        <td>${roleBadgeMap[u.role] || u.role}</td>
        <td style="font-size: 12px; color: var(--text-muted);">${formatDate(u.created_at)}</td>
        <td style="text-align: right;">
          ${currentUser && currentUser.id === u.id ? `
            <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">(Current Account)</span>
          ` : `
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteUser(${u.id}, '${escapeHtml(u.username)}')">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          `}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load user list: ' + err.message, 'error');
  }
}

/**
 * Handle Add New User Form Submission
 */
async function handleCreateUser(e) {
  e.preventDefault();

  const name = document.getElementById('new-user-name').value.trim();
  const username = document.getElementById('new-user-username').value.trim();
  const password = document.getElementById('new-user-password').value.trim();
  const role = document.getElementById('new-user-role').value;

  if (!name || !username || !password || !role) {
    showToast('Please fill in all user details.', 'error');
    return;
  }

  const submitBtn = document.getElementById('create-user-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

  try {
    await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, username, password, role })
    });

    showToast(`User account @${username} created successfully!`, 'success');
    document.getElementById('create-user-modal').classList.remove('active');
    await loadUsersList();
  } catch (err) {
    showToast(err.message || 'Failed to create user.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Create User Account';
  }
}

/**
 * Confirm and Delete User
 */
function confirmDeleteUser(userId, username) {
  showConfirmModal({
    title: 'Delete User Account',
    message: `Are you sure you want to permanently delete user @${username}? Any tasks currently assigned to this user will be marked as unassigned.`,
    confirmText: 'Delete User',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
        showToast(`User @${username} deleted.`, 'success');
        await loadUsersList();
      } catch (err) {
        showToast('Failed to delete user: ' + err.message, 'error');
      }
    }
  });
}

/**
 * Load Global Maintenance History Log (Timeline)
 */
async function loadGlobalHistory() {
  const loading = document.getElementById('history-loading');
  const timeline = document.getElementById('global-history-timeline');

  if (loading) loading.style.display = 'block';
  if (timeline) timeline.style.display = 'none';

  try {
    const data = await apiFetch('/api/history?limit=50');
    const logs = data.history || [];

    if (loading) loading.style.display = 'none';

    if (logs.length === 0) {
      if (timeline) {
        timeline.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No history records found.</p>';
        timeline.style.display = 'block';
      }
      return;
    }

    if (timeline) {
      timeline.innerHTML = logs.map(item => `
        <div class="timeline-item">
          <div class="timeline-dot"><i class="fas fa-wrench"></i></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-action">
                <span class="issue-id-tag" style="margin-right: 6px;">#${item.issue_id}</span>
                ${escapeHtml(item.action)}
              </span>
              <span class="timeline-time">${formatDate(item.timestamp)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 12px; color: var(--text-muted);">
              <div>
                <i class="fas fa-location-dot" style="color: var(--primary-600); margin-right: 4px;"></i>
                <span>${escapeHtml(formatLocation(item))}</span>
              </div>
              <div class="timeline-performer">
                <i class="fas fa-user-circle"></i>
                <span>${escapeHtml(item.performed_by_name || 'System')} (${escapeHtml(item.performed_by_role || 'staff')})</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      timeline.style.display = 'block';
    }
  } catch (err) {
    if (loading) loading.style.display = 'none';
    showToast('Failed to load history: ' + err.message, 'error');
  }
}

/**
 * Open Task Detail Modal in Admin View
 */
async function openAdminIssueDetail(issueId) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');

  title.textContent = `Issue #${issueId} - Administrative Audit`;
  body.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  modal.classList.add('active');

  try {
    const data = await apiFetch(`/api/issues/${issueId}`);
    const issue = data.issue;
    const history = data.history || [];

    body.innerHTML = `
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="font-size: 15px; font-weight: 700;">${escapeHtml(formatLocation(issue))}</h4>
          <div>
            ${getStatusBadge(issue.status)}
            ${getPriorityBadge(issue.priority)}
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
          Category: ${escapeHtml(issue.category)} &bull; Reported by: <strong>${escapeHtml(issue.reporter_name)}</strong>
        </p>
        <div style="background: var(--bg-subtle); padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px;">
          <strong>Description:</strong> ${escapeHtml(issue.description)}
        </div>
        ${issue.photo_path ? `
          <div style="margin-bottom: 10px;">
            <img src="${issue.photo_path}" style="max-height: 180px; border-radius: 6px; box-shadow: var(--shadow-sm);" alt="Photo">
          </div>
        ` : ''}
        ${issue.completion_note ? `
          <div style="background: #ecfdf5; border-left: 3px solid #059669; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #065f46;">
            <strong>Completion Note:</strong> ${escapeHtml(issue.completion_note)}
          </div>
        ` : ''}
      </div>

      <h5 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">
        <i class="fas fa-list-timeline" style="color: var(--primary-600);"></i> Issue Audit Trail
      </h5>

      <div class="timeline">
        ${history.map(item => `
          <div class="timeline-item">
            <div class="timeline-dot"><i class="fas fa-check"></i></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-action">${escapeHtml(item.action)}</span>
                <span class="timeline-time">${formatDate(item.timestamp)}</span>
              </div>
              <div class="timeline-performer">
                <i class="fas fa-user-circle"></i>
                <span>${escapeHtml(item.performed_by_name || 'System')} (${escapeHtml(item.performed_by_role || 'staff')})</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load audit: ${err.message}</div>`;
  }
}
