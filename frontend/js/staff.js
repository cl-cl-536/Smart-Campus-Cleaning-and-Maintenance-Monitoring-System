/**
 * Smart Campus Cleaning & Maintenance Monitoring System
 * Cleaning & Maintenance Staff Dashboard Logic
 */

let allStaffTasks = [];
let activeStatusFilter = 'all';
let currentCompletingIssueId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Protect page: staff or admin only
  const user = await checkAuth(['staff', 'admin']);
  if (!user) return;

  // Initial load
  await loadStaffTasks();

  // Tab filters
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.onclick = () => {
      tabButtons.forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-secondary');
      });
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary', 'active');

      activeStatusFilter = btn.getAttribute('data-status');
      renderStaffTasks();
    };
  });

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh-tasks');
  if (refreshBtn) {
    refreshBtn.onclick = () => loadStaffTasks();
  }

  // Completion modal listeners
  const completionModal = document.getElementById('completion-modal');
  const closeCompBtns = [
    document.getElementById('completion-modal-close'),
    document.getElementById('completion-modal-cancel')
  ];
  closeCompBtns.forEach(btn => {
    if (btn) btn.onclick = () => completionModal.classList.remove('active');
  });

  const confirmCompBtn = document.getElementById('completion-modal-confirm');
  if (confirmCompBtn) {
    confirmCompBtn.onclick = handleConfirmComplete;
  }

  // Detail modal listeners
  const detailModal = document.getElementById('detail-modal');
  const closeDetailBtns = [
    document.getElementById('modal-detail-close'),
    document.getElementById('modal-detail-close-btn')
  ];
  closeDetailBtns.forEach(btn => {
    if (btn) btn.onclick = () => detailModal.classList.remove('active');
  });
});

/**
 * Fetch assigned tasks for the authenticated staff member
 */
async function loadStaffTasks() {
  const loading = document.getElementById('tasks-loading');
  const grid = document.getElementById('tasks-grid');
  const empty = document.getElementById('tasks-empty');

  if (loading) loading.style.display = 'block';
  if (grid) grid.style.display = 'none';
  if (empty) empty.style.display = 'none';

  try {
    const data = await apiFetch('/api/issues');
    allStaffTasks = data.issues || [];

    updateCountersAndTabs();
    renderStaffTasks();
  } catch (err) {
    if (loading) loading.style.display = 'none';
    showToast('Failed to load your assigned tasks: ' + err.message, 'error');
  }
}

/**
 * Calculate workload metrics and update tab counters
 */
function updateCountersAndTabs() {
  const total = allStaffTasks.length;
  const assigned = allStaffTasks.filter(t => t.status === 'Assigned' || t.status === 'Pending').length;
  const inProgress = allStaffTasks.filter(t => t.status === 'In Progress').length;
  const completed = allStaffTasks.filter(t => t.status === 'Completed').length;

  // Stat summary cards
  const statTotal = document.getElementById('staff-stat-total');
  const statActive = document.getElementById('staff-stat-active');
  const statDone = document.getElementById('staff-stat-done');

  if (statTotal) statTotal.textContent = total;
  if (statActive) statActive.textContent = inProgress;
  if (statDone) statDone.textContent = completed;

  // Tab counters
  const tabAll = document.getElementById('tab-count-all');
  const tabAssigned = document.getElementById('tab-count-assigned');
  const tabInprogress = document.getElementById('tab-count-inprogress');
  const tabCompleted = document.getElementById('tab-count-completed');

  if (tabAll) tabAll.textContent = total;
  if (tabAssigned) tabAssigned.textContent = assigned;
  if (tabInprogress) tabInprogress.textContent = inProgress;
  if (tabCompleted) tabCompleted.textContent = completed;
}

/**
 * Render filtered task cards into grid
 */
function renderStaffTasks() {
  const loading = document.getElementById('tasks-loading');
  const grid = document.getElementById('tasks-grid');
  const empty = document.getElementById('tasks-empty');

  if (loading) loading.style.display = 'none';

  // Apply active tab filter
  let filtered = allStaffTasks;
  if (activeStatusFilter === 'Assigned') {
    filtered = allStaffTasks.filter(t => t.status === 'Assigned' || t.status === 'Pending');
  } else if (activeStatusFilter !== 'all') {
    filtered = allStaffTasks.filter(t => t.status === activeStatusFilter);
  }

  if (filtered.length === 0) {
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (grid) {
    grid.innerHTML = filtered.map(task => `
      <div class="issue-card" id="task-card-${task.id}">
        <div>
          <div class="issue-card-top">
            <span class="issue-id-tag">#${task.id}</span>
            ${getStatusBadge(task.status)}
          </div>

          <div class="issue-location">${escapeHtml(task.zone)}</div>
          <div class="issue-building-room">
            <i class="fas fa-location-dot" style="color: var(--primary-600);"></i>
            <span>${escapeHtml(formatLocation(task))}</span>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            ${getCategoryBadge(task.category)}
            ${getPriorityBadge(task.priority)}
          </div>

          <div class="issue-description">
            ${escapeHtml(task.description)}
          </div>

          ${task.photo_path ? `
            <img src="${task.photo_path}" class="issue-thumbnail" alt="Task photo" onclick="viewPhoto('${task.photo_path}')" title="Click to enlarge photo">
          ` : ''}

          ${task.status === 'Completed' && task.completion_note ? `
            <div style="background: #ecfdf5; border-left: 3px solid #059669; padding: 10px 12px; border-radius: 6px; font-size: 13px; color: #065f46; margin-bottom: 12px;">
              <strong><i class="fas fa-check-circle"></i> Completion Note:</strong>
              <div style="margin-top: 2px;">${escapeHtml(task.completion_note)}</div>
            </div>
          ` : ''}

          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
            <span><i class="far fa-user"></i> Reported by: <strong>${escapeHtml(task.reporter_name || 'Campus Member')}</strong></span>
            <span style="margin-left: 8px;"><i class="far fa-clock"></i> ${formatDate(task.created_at)}</span>
          </div>
        </div>

        <div class="issue-footer" style="flex-wrap: wrap; gap: 8px;">
          <div>
            <button class="btn btn-secondary btn-sm" onclick="openStaffTaskDetail(${task.id})">
              <i class="fas fa-history"></i> Timeline
            </button>
          </div>

          <!-- Action Buttons Based on Status Flow -->
          <div style="display: flex; gap: 8px;">
            ${task.status === 'Assigned' || task.status === 'Pending' ? `
              <button class="btn btn-warning btn-sm" onclick="startWork(${task.id})">
                <i class="fas fa-play"></i> Start Work
              </button>
            ` : ''}

            ${task.status === 'In Progress' ? `
              <button class="btn btn-success btn-sm" onclick="openCompletionModal(${task.id})">
                <i class="fas fa-check"></i> Mark Completed
              </button>
            ` : ''}

            ${task.status === 'Completed' ? `
              <span style="font-size: 12px; color: #059669; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <i class="fas fa-circle-check"></i> Work Finished
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    grid.style.display = 'grid';
  }
}

/**
 * Handle Start Work action (Transition to 'In Progress')
 */
async function startWork(issueId) {
  try {
    const res = await apiFetch(`/api/issues/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'In Progress' })
    });

    showToast(`Task #${issueId} status is now In Progress. Keep up the good work!`, 'success');
    await loadStaffTasks();
  } catch (err) {
    showToast('Failed to start work: ' + err.message, 'error');
  }
}

/**
 * Open Completion Modal dialog
 */
function openCompletionModal(issueId) {
  currentCompletingIssueId = issueId;
  const modal = document.getElementById('completion-modal');
  const labelId = document.getElementById('completion-modal-issue-id');
  const noteInput = document.getElementById('completion-note-input');

  if (labelId) labelId.textContent = `#${issueId}`;
  if (noteInput) {
    noteInput.value = '';
    setTimeout(() => noteInput.focus(), 100);
  }

  modal.classList.add('active');
}

/**
 * Submit Completion with Note
 */
async function handleConfirmComplete() {
  if (!currentCompletingIssueId) return;

  const noteInput = document.getElementById('completion-note-input');
  const note = noteInput ? noteInput.value.trim() : '';

  if (!note) {
    showToast('Please enter a brief completion note before submitting.', 'error');
    if (noteInput) noteInput.focus();
    return;
  }

  const modal = document.getElementById('completion-modal');
  const confirmBtn = document.getElementById('completion-modal-confirm');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    await apiFetch(`/api/issues/${currentCompletingIssueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Completed',
        completion_note: note
      })
    });

    modal.classList.remove('active');
    showToast(`Task #${currentCompletingIssueId} marked Completed!`, 'success');
    await loadStaffTasks();
  } catch (err) {
    showToast('Failed to complete task: ' + err.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-check"></i> Submit & Mark Completed';
    currentCompletingIssueId = null;
  }
}

/**
 * View Photo in Modal
 */
function viewPhoto(url) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');

  title.textContent = 'Attached Photo';
  body.innerHTML = `
    <div style="text-align: center;">
      <img src="${url}" style="max-width: 100%; max-height: 70vh; border-radius: 8px; margin: 0 auto; box-shadow: var(--shadow-md);" alt="Attached photo">
    </div>
  `;
  modal.classList.add('active');
}

/**
 * Open Detail and History Timeline
 */
async function openStaffTaskDetail(issueId) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');

  title.textContent = `Task #${issueId} - Details & Audit`;
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
          <strong>Work Description:</strong> ${escapeHtml(issue.description)}
        </div>
        ${issue.completion_note ? `
          <div style="background: #ecfdf5; border-left: 3px solid #059669; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #065f46;">
            <strong>Completion Note:</strong> ${escapeHtml(issue.completion_note)}
          </div>
        ` : ''}
      </div>

      <h5 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">
        <i class="fas fa-list-timeline" style="color: var(--primary-600);"></i> Task History
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
