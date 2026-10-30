/**
 * Smart Campus Cleaning & Maintenance Monitoring System
 * Supervisor Operations Board Logic
 */

let staffMembers = [];
let searchDebounceTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Protect page: supervisor or admin only
  const user = await checkAuth(['supervisor', 'admin']);
  if (!user) return;

  // If role is supervisor, hide admin menu item
  if (user.role !== 'admin') {
    const adminLink = document.getElementById('nav-admin-link');
    if (adminLink) adminLink.style.display = 'none';
  }

  // 1. Fetch staff list
  await loadStaffList();

  // 2. Fetch statistics
  await loadSummaryStats();

  // 3. Fetch and render issues
  await loadIssues();

  // Setup filter event listeners
  const zoneFilter = document.getElementById('filter-zone');
  const floorFilter = document.getElementById('filter-floor');
  const statusFilter = document.getElementById('filter-status');
  const priorityFilter = document.getElementById('filter-priority');
  const categoryFilter = document.getElementById('filter-category');
  const searchFilter = document.getElementById('filter-search');
  const resetBtn = document.getElementById('btn-reset-filters');
  const refreshBtn = document.getElementById('btn-refresh-issues');

  if (zoneFilter) zoneFilter.onchange = () => loadIssues();
  if (floorFilter) floorFilter.onchange = () => loadIssues();
  if (statusFilter) statusFilter.onchange = () => loadIssues();
  if (priorityFilter) priorityFilter.onchange = () => loadIssues();
  if (categoryFilter) categoryFilter.onchange = () => loadIssues();

  if (searchFilter) {
    searchFilter.oninput = () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        loadIssues();
      }, 300);
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      if (zoneFilter) zoneFilter.value = 'all';
      if (floorFilter) floorFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (priorityFilter) priorityFilter.value = 'all';
      if (categoryFilter) categoryFilter.value = 'all';
      if (searchFilter) searchFilter.value = '';
      loadIssues();
    };
  }

  if (refreshBtn) {
    refreshBtn.onclick = () => {
      loadSummaryStats();
      loadIssues();
    };
  }

  // Modal close handlers
  const detailModal = document.getElementById('detail-modal');
  const closeBtns = [
    document.getElementById('modal-detail-close'),
    document.getElementById('modal-detail-close-btn')
  ];
  closeBtns.forEach(btn => {
    if (btn) btn.onclick = () => detailModal.classList.remove('active');
  });
});

/**
 * Fetch staff members for assignment dropdowns
 */
async function loadStaffList() {
  try {
    const data = await apiFetch('/api/staff');
    staffMembers = data.staff || [];
  } catch (err) {
    console.error('Error fetching staff list:', err);
    showToast('Failed to load staff list: ' + err.message, 'error');
  }
}

/**
 * Fetch and populate summary metric counters
 */
async function loadSummaryStats() {
  try {
    const data = await apiFetch('/api/statistics');
    const s = data.summary || {};
    
    document.getElementById('stat-total').textContent = s.total || 0;
    document.getElementById('stat-pending').textContent = s.pending || 0;
    document.getElementById('stat-assigned').textContent = s.assigned || 0;
    document.getElementById('stat-inprogress').textContent = s.in_progress || 0;
    document.getElementById('stat-completed').textContent = s.completed || 0;
  } catch (err) {
    console.error('Error fetching statistics:', err);
  }
}

/**
 * Fetch issues based on active filters and render table
 */
async function loadIssues() {
  const loading = document.getElementById('issues-loading');
  const tableWrap = document.getElementById('issues-table-wrap');
  const tableBody = document.getElementById('issues-table-body');
  const empty = document.getElementById('issues-empty');
  const countBadge = document.getElementById('issues-count-badge');

  if (loading) loading.style.display = 'block';
  if (tableWrap) tableWrap.style.display = 'none';
  if (empty) empty.style.display = 'none';

  // Read filter values
  const zone = (document.getElementById('filter-zone') || {}).value;
  const floor = (document.getElementById('filter-floor') || {}).value;
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const category = document.getElementById('filter-category').value;
  const search = document.getElementById('filter-search').value.trim();

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

    if (tableBody) {
      tableBody.innerHTML = issues.map(issue => `
        <tr>
          <td>
            <span class="issue-id-tag">#${issue.id}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 13px; line-height: 1.4;">
              ${escapeHtml(formatLocation(issue))}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; max-width: 300px; white-space: normal;">
              ${escapeHtml(issue.description)}
            </div>
            ${issue.photo_path ? `
              <div style="margin-top: 6px;">
                <a href="javascript:void(0)" onclick="viewPhoto('${issue.photo_path}')" style="font-size: 11px; color: var(--primary-600); font-weight: 600;">
                  <i class="fas fa-image"></i> View Photo
                </a>
              </div>
            ` : ''}
          </td>
          <td>
            ${getCategoryBadge(issue.category)}
          </td>
          <td>
            <!-- Interactive Priority Changer -->
            <select class="form-select form-select-sm" style="padding: 4px 8px; font-size: 12px; font-weight: 600; width: auto;" onchange="handlePriorityChange(${issue.id}, this.value)">
              <option value="Low" ${issue.priority === 'Low' ? 'selected' : ''}>Low</option>
              <option value="Medium" ${issue.priority === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="High" ${issue.priority === 'High' ? 'selected' : ''}>High</option>
            </select>
          </td>
          <td>
            ${getStatusBadge(issue.status)}
            ${issue.completion_note ? `
              <div style="font-size: 11px; color: #059669; margin-top: 4px; max-width: 180px;" title="${escapeHtml(issue.completion_note)}">
                <i class="fas fa-note-sticky"></i> Note added
              </div>
            ` : ''}
          </td>
          <td>
            <!-- Interactive Staff Assignment Dropdown -->
            <select class="form-select form-select-sm" style="padding: 4px 8px; font-size: 12px; min-width: 150px;" onchange="handleStaffAssign(${issue.id}, this.value)">
              <option value="" ${!issue.assigned_to ? 'selected' : ''}>-- Unassigned --</option>
              ${staffMembers.map(staff => `
                <option value="${staff.id}" ${issue.assigned_to === staff.id ? 'selected' : ''}>
                  ${escapeHtml(staff.name)}
                </option>
              `).join('')}
            </select>
          </td>
          <td>
            <div style="font-size: 12px; font-weight: 600; color: var(--text-main);">${escapeHtml(issue.reporter_name || 'Reporter')}</div>
            <div style="font-size: 11px; color: var(--text-muted);"><i class="far fa-clock"></i> ${formatDate(issue.created_at)}</div>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="openSupervisorDetail(${issue.id})" title="View Details and History Timeline">
              <i class="fas fa-history"></i> Audit
            </button>
          </td>
        </tr>
      `).join('');

      if (tableWrap) tableWrap.style.display = 'block';
    }
  } catch (err) {
    if (loading) loading.style.display = 'none';
    showToast('Failed to load issues: ' + err.message, 'error');
  }
}

/**
 * Handle staff assignment change
 */
async function handleStaffAssign(issueId, staffId) {
  if (!staffId) {
    showToast('Please select a valid staff member to assign.', 'info');
    return;
  }

  const staff = staffMembers.find(s => s.id == staffId);
  const staffName = staff ? staff.name : 'Staff';

  try {
    const res = await apiFetch(`/api/issues/${issueId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to: parseInt(staffId, 10) })
    });

    showToast(`Issue #${issueId} assigned to ${staffName}. Status is now ${res.status}.`, 'success');
    loadSummaryStats();
    loadIssues();
  } catch (err) {
    showToast('Failed to assign staff: ' + err.message, 'error');
    loadIssues();
  }
}

/**
 * Handle priority change
 */
async function handlePriorityChange(issueId, priority) {
  try {
    await apiFetch(`/api/issues/${issueId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority })
    });

    showToast(`Issue #${issueId} priority updated to ${priority}.`, 'success');
    loadSummaryStats();
  } catch (err) {
    showToast('Failed to update priority: ' + err.message, 'error');
    loadIssues();
  }
}

/**
 * View photo in modal
 */
function viewPhoto(url) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');

  title.textContent = 'Issue Photo';
  body.innerHTML = `
    <div style="text-align: center;">
      <img src="${url}" style="max-width: 100%; max-height: 70vh; border-radius: 8px; margin: 0 auto; box-shadow: var(--shadow-md);" alt="Attached photo">
    </div>
  `;
  modal.classList.add('active');
}

/**
 * Open detail and history timeline modal
 */
async function openSupervisorDetail(issueId) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');

  title.textContent = `Issue #${issueId} - Maintenance Audit Trail`;
  body.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading timeline...</div>';
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
        ${issue.completion_note ? `
          <div style="background: #ecfdf5; border-left: 3px solid #059669; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #065f46;">
            <strong>Completion Note:</strong> ${escapeHtml(issue.completion_note)}
          </div>
        ` : ''}
      </div>

      <h5 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">
        <i class="fas fa-clock-rotate-left" style="color: var(--primary-600);"></i> Activity & Action History
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
    body.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load timeline: ${err.message}</div>`;
  }
}
