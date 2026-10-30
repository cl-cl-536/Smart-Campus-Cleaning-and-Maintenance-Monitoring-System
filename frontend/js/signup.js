/**
 * Smart Campus Cleaning & Maintenance Monitoring System
 * Reporter Sign Up Logic & Live Validation
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const fullnameInput = document.getElementById('fullname');
  const usernameInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const confirmPassInput = document.getElementById('confirm-password');
  const matchIndicator = document.getElementById('password-match-indicator');
  const errorAlert = document.getElementById('signup-error-alert');
  const errorText = document.getElementById('signup-error-text');
  const successAlert = document.getElementById('signup-success-alert');
  const successText = document.getElementById('signup-success-text');
  const submitBtn = document.getElementById('submit-signup-btn');
  const btnText = document.getElementById('signup-btn-text');

  // Toggle Password visibility
  setupPasswordToggle('toggle-password', 'password');
  setupPasswordToggle('toggle-confirm-password', 'confirm-password');

  function setupPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (btn && input) {
      btn.onclick = () => {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
      };
    }
  }

  // Live Password Match Indicator
  function checkPasswordMatch() {
    const p1 = passInput.value;
    const p2 = confirmPassInput.value;

    if (!p2) {
      matchIndicator.style.display = 'none';
      return;
    }

    matchIndicator.style.display = 'block';
    if (p1 === p2 && p1.length >= 6) {
      matchIndicator.style.color = '#059669';
      matchIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Passwords match';
    } else if (p1 !== p2) {
      matchIndicator.style.color = '#dc2626';
      matchIndicator.innerHTML = '<i class="fas fa-circle-xmark"></i> Passwords do not match';
    } else {
      matchIndicator.style.color = '#d97706';
      matchIndicator.innerHTML = '<i class="fas fa-circle-info"></i> Password must be at least 6 characters';
    }
  }

  if (passInput) passInput.addEventListener('input', checkPasswordMatch);
  if (confirmPassInput) confirmPassInput.addEventListener('input', checkPasswordMatch);

  // Form Submission
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      const name = fullnameInput.value.trim();
      const username = usernameInput.value.trim().toLowerCase();
      const password = passInput.value;
      const confirm_password = confirmPassInput.value;

      // 1. Check for empty fields
      if (!name) {
        showError('Please enter your full name.');
        fullnameInput.focus();
        return;
      }

      if (!username) {
        showError('Please enter a desired username.');
        usernameInput.focus();
        return;
      }

      if (username.length < 3) {
        showError('Username must be at least 3 characters long.');
        usernameInput.focus();
        return;
      }

      if (!password) {
        showError('Please enter a password.');
        passInput.focus();
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        passInput.focus();
        return;
      }

      if (!confirm_password) {
        showError('Please confirm your password.');
        confirmPassInput.focus();
        return;
      }

      // 2. Check password match
      if (password !== confirm_password) {
        showError('Passwords do not match. Please verify both password fields.');
        confirmPassInput.focus();
        return;
      }

      // Clear any prior errors
      if (errorAlert) errorAlert.style.display = 'none';

      // UI Loading state
      submitBtn.disabled = true;
      btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

      try {
        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            username,
            password,
            confirm_password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed. Please check your information.');
        }

        // Show Success UI
        if (errorAlert) errorAlert.style.display = 'none';
        if (successAlert) {
          if (successText) {
            successText.innerHTML = `Welcome <strong>${escapeHtml(data.user.name)}</strong>! Redirecting you to the sign-in page...`;
          }
          successAlert.style.display = 'flex';
        }

        showToast('Account created successfully! Please sign in.', 'success', 'Registration Complete');

        // Form reset & redirect after brief delay
        form.reset();
        matchIndicator.style.display = 'none';

        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1600);

      } catch (err) {
        showError(err.message || 'Failed to create account.');
        submitBtn.disabled = false;
        btnText.innerHTML = '<span>Create Account</span> <i class="fas fa-user-plus" style="font-size: 13px;"></i>';
      }
    };
  }

  function showError(msg) {
    if (errorAlert && errorText) {
      errorText.textContent = msg;
      errorAlert.style.display = 'flex';

      // Card shake effect
      const card = document.querySelector('.login-card');
      if (card) {
        card.style.animation = 'shake 0.4s ease';
        setTimeout(() => {
          card.style.animation = '';
        }, 400);
      }
    } else {
      showToast(msg, 'error');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }
});

// Keyframe animation for card shake
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(style);
