/**
 * Smart Campus Cleaning & Maintenance Monitoring System
 * Report Issue Page Logic & Personal Issues Tracker
 */

let selectedFile = null;

const OUTDOOR_ZONES = ['Euphoria Stairs', 'Open Canteen', 'Backcourt'];

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth - allows reporter, supervisor, admin, staff
  const user = await checkAuth();
  if (!user) return;

  // Show management links if admin or supervisor
  if (user.role === 'admin' || user.role === 'supervisor') {
    const elevatedNav = document.getElementById('elevated-nav-links');
    if (elevatedNav) elevatedNav.style.display = 'block';
  }

  // Setup form components
  initFormInteractions();

  // Load reporter's submitted issues
  loadMyReports();

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh-reports');
  if (refreshBtn) {
    refreshBtn.onclick = () => loadMyReports();
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
 * Initialize Form Events: Zone Change Logic, Char Counter, Photo Upload Drag & Drop, Preview
 */
function initFormInteractions() {
  const zoneSelect = document.getElementById('zone');
  const roomInput = document.getElementById('room');
  const roomReqIndicator = document.getElementById('room-required-indicator');
  const roomHint = document.getElementById('room-hint');

  // Dynamic Room validation based on outdoor vs indoor zone
  if (zoneSelect && roomInput) {
    zoneSelect.onchange = () => {
      const selectedZone = zoneSelect.value;
      const isOutdoor = OUTDOOR_ZONES.includes(selectedZone);

      if (isOutdoor) {
        roomInput.removeAttribute('required');
        if (roomReqIndicator) roomReqIndicator.style.display = 'none';
        if (roomHint) roomHint.textContent = 'Optional for outdoor zones (Euphoria Stairs, Open Canteen, Backcourt)';
        roomInput.placeholder = 'Optional for outdoor zone';
      } else {
        roomInput.setAttribute('required', 'required');
        if (roomReqIndicator) roomReqIndicator.style.display = 'inline';
        if (roomHint) roomHint.textContent = 'Required for indoor campus buildings and halls';
        roomInput.placeholder = 'Room 204 or Lab 3';
      }
    };
  }

  const descInput = document.getElementById('description');
  const charCounter = document.getElementById('char-counter');
  if (descInput && charCounter) {
    descInput.oninput = () => {
      charCounter.textContent = `${descInput.value.length} / 1000`;
    };
  }

  const fileInput = document.getElementById('photo');
  const previewContainer = document.getElementById('photo-preview-container');
  const previewImg = document.getElementById('photo-preview-img');
  const filenameLabel = document.getElementById('photo-filename-label');
  const removePhotoBtn = document.getElementById('btn-remove-photo');
  const dropZone = document.getElementById('drop-zone');

  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      handleFileSelected(file);
    };
  }

  // Drag and drop support
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-600)';
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-strong)';
      });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  function handleFileSelected(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      showToast('Image size exceeds 16 MB limit.', 'error');
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg) previewImg.src = e.target.result;
      if (filenameLabel) filenameLabel.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      if (previewContainer) previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  if (removePhotoBtn) {
    removePhotoBtn.onclick = () => {
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (previewContainer) previewContainer.style.display = 'none';
      if (previewImg) previewImg.src = '';
    };
  }

  // Form Submission
  const reportForm = document.getElementById('issue-report-form');
  const submitBtn = document.getElementById('submit-report-btn');
  const btnText = document.getElementById('submit-btn-text');
  const successAlert = document.getElementById('report-success-alert');
  const successIssueId = document.getElementById('success-issue-id');
  const errorAlert = document.getElementById('report-form-error');
  const errorText = document.getElementById('report-form-error-text');

  if (reportForm) {
    reportForm.onsubmit = async (e) => {
      e.preventDefault();

      const zone = document.getElementById('zone').value.trim();
      const floor = document.getElementById('floor').value.trim();
      const room = document.getElementById('room').value.trim();
      const exact_location = document.getElementById('exact_location').value.trim();
      const category = (document.querySelector('input[name="category"]:checked') || {}).value;
      const priority = (document.querySelector('input[name="priority"]:checked') || {}).value;
      const description = document.getElementById('description').value.trim();

      // Clear previous error
      if (errorAlert) errorAlert.style.display = 'none';

      // 1. Validate Zone
      if (!zone) {
        showFormError('Please select a Campus Zone.');
        document.getElementById('zone').focus();
        return;
      }

      // 2. Validate Floor
      if (!floor) {
        showFormError('Please select a Floor No.');
        document.getElementById('floor').focus();
        return;
      }

      // 3. Validate Room (required for indoor zones)
      const isOutdoor = OUTDOOR_ZONES.includes(zone);
      if (!isOutdoor && !room) {
        showFormError(`Room No is required for indoor zone "${zone}" (e.g. Room 204 or Lab 3).`);
        document.getElementById('room').focus();
        return;
      }

      // 4. Validate Exact Location
      if (!exact_location) {
        showFormError('Please describe the Exact Location (e.g. Near the water cooler, left side of the corridor).');
        document.getElementById('exact_location').focus();
        return;
      }

      // 5. Validate Category, Priority, Description
      if (!category) {
        showFormError('Please select an issue category.');
        return;
      }

      if (!priority) {
        showFormError('Please select an urgency level.');
        return;
      }

      if (!description) {
        showFormError('Please describe the maintenance issue.');
        document.getElementById('description').focus();
        return;
      }

      // Prepare FormData
      const formData = new FormData();
      formData.append('zone', zone);
      formData.append('floor', floor);
      formData.append('room', room);
      formData.append('exact_location', exact_location);
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('description', description);

      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      // UI Loading state
      submitBtn.disabled = true;
      btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      try {
        const result = await apiFetch('/api/issues', {
          method: 'POST',
          body: formData
        });

        // Show success UI
        if (successIssueId) successIssueId.textContent = `#${result.issue_id}`;
        if (successAlert) {
          successAlert.style.display = 'block';
          successAlert.scrollIntoView({ behavior: 'smooth' });
        }

        showToast(`Report #${result.issue_id} submitted successfully!`, 'success');

        // Reset form fields
        reportForm.reset();
        selectedFile = null;
        if (previewContainer) previewContainer.style.display = 'none';
        if (charCounter) charCounter.textContent = '0 / 1000';

        // Reload the user's issue list
        loadMyReports();

      } catch (err) {
        showFormError(err.message || 'Failed to submit report.');
        showToast(err.message || 'Failed to submit report.', 'error');
      } finally {
        submitBtn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Maintenance Report';
      }
    };
  }

  function showFormError(msg) {
    if (errorAlert && errorText) {
      errorText.textContent = msg;
      errorAlert.style.display = 'flex';
      errorAlert.scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast(msg, 'error');
    }
  }

  // Quick Action buttons on success banner
  const viewSubmittedBtn = document.getElementById('btn-view-submitted');
  const reportAnotherBtn = document.getElementById('btn-report-another');

  if (viewSubmittedBtn) {
    viewSubmittedBtn.onclick = () => {
      const target = document.getElementById('my-reports-section');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    };
  }

  if (reportAnotherBtn) {
    reportAnotherBtn.onclick = () => {
      if (successAlert) successAlert.style.display = 'none';
      const z = document.getElementById('zone');
      if (z) z.focus();
    };
  }
}

/**
 * Fetch and Render Issues Reported by Current User
 */
async function loadMyReports() {
  const loadingEl = document.getElementById('reports-loading');
  const gridEl = document.getElementById('reports-grid');
  const emptyEl = document.getElementById('reports-empty');

  if (loadingEl) loadingEl.style.display = 'block';
  if (gridEl) gridEl.style.display = 'none';
  if (emptyEl) emptyEl.style.display = 'none';

  try {
    const data = await apiFetch('/api/issues');
    const issues = data.issues || [];

    if (loadingEl) loadingEl.style.display = 'none';

    if (issues.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (gridEl) {
      gridEl.innerHTML = issues.map(issue => `
        <div class="issue-card">
          <div>
            <div class="issue-card-top">
              <span class="issue-id-tag">#${issue.id}</span>
              ${getStatusBadge(issue.status)}
            </div>

            <div class="issue-location">${escapeHtml(issue.zone)}</div>
            <div class="issue-building-room">
              <i class="fas fa-location-dot" style="color: var(--primary-600);"></i>
              <span>${escapeHtml(formatLocation(issue))}</span>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
              ${getCategoryBadge(issue.category)}
              ${getPriorityBadge(issue.priority)}
            </div>

            <div class="issue-description">
              ${escapeHtml(issue.description)}
            </div>

            ${issue.photo_path ? `
              <img src="${issue.photo_path}" class="issue-thumbnail" alt="Issue photo" onclick="viewPhoto('${issue.photo_path}')" title="Click to view full photo">
            ` : ''}

            ${issue.status === 'Completed' && issue.completion_note ? `
              <div style="background: #ecfdf5; border-left: 3px solid #059669; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #065f46; margin-bottom: 12px;">
                <strong><i class="fas fa-check-circle"></i> Completion Note:</strong> ${escapeHtml(issue.completion_note)}
              </div>
            ` : ''}
          </div>

          <div class="issue-footer">
            <div style="font-size: 11px; color: var(--text-muted);">
              <div><i class="far fa-calendar-alt"></i> ${formatDate(issue.created_at)}</div>
              <div><i class="fas fa-user-check"></i> ${issue.assignee_name ? escapeHtml(issue.assignee_name) : 'Awaiting Assignment'}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="openIssueDetail(${issue.id})">
              <i class="fas fa-clock-rotate-left"></i> Timeline
            </button>
          </div>
        </div>
      `).join('');

      gridEl.style.display = 'grid';
    }
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    showToast('Failed to load your reports: ' + err.message, 'error');
  }
}

/**
 * View photo in full modal
 */
function viewPhoto(url) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');

  title.textContent = 'Attached Issue Photo';
  body.innerHTML = `
    <div style="text-align: center;">
      <img src="${url}" style="max-width: 100%; max-height: 70vh; border-radius: 8px; margin: 0 auto; box-shadow: var(--shadow-md);" alt="Attached photo">
    </div>
  `;
  modal.classList.add('active');
}

/**
 * Open Issue Detail and Full History Timeline
 */
async function openIssueDetail(issueId) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');

  title.textContent = `Issue #${issueId} - Maintenance Audit`;
  body.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading timeline...</div>';
  modal.classList.add('active');

  try {
    const data = await apiFetch(`/api/issues/${issueId}`);
    const issue = data.issue;
    const history = data.history || [];

    body.innerHTML = `
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="font-size: 16px; font-weight: 700;">${escapeHtml(formatLocation(issue))}</h4>
          ${getStatusBadge(issue.status)}
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">Category: ${escapeHtml(issue.category)} &bull; Priority: ${issue.priority}</p>
        <p style="font-size: 13px; color: var(--text-main); background: var(--bg-subtle); padding: 10px; border-radius: 6px;">
          ${escapeHtml(issue.description)}
        </p>
      </div>

      <h5 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 10px;">
        <i class="fas fa-list-timeline" style="color: var(--primary-600);"></i> Maintenance History Log
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
                <span>${escapeHtml(item.performed_by_name || 'System')} (${escapeHtml(item.performed_by_role || 'user')})</span>
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
