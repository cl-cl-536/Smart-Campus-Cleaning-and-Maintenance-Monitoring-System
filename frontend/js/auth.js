/**
 * Smart Campus Cleaning & Maintenance Monitoring System
 * Login Authentication Logic
 */

function quickFill(user, pass) {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  if (usernameInput && passwordInput) {
    usernameInput.value = user;
    passwordInput.value = pass;
    // Clear error
    const errAlert = document.getElementById('login-error-alert');
    if (errAlert) errAlert.style.display = 'none';
    // Highlight inputs briefly
    usernameInput.focus();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, redirect directly to dashboard
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        redirectToRoleHome(data.user.role);
        return;
      }
    }
  } catch (e) {
    // Ignore, let user login
  }

  // Password visibility toggle
  const togglePassBtn = document.getElementById('toggle-password');
  const passInput = document.getElementById('password');
  if (togglePassBtn && passInput) {
    togglePassBtn.onclick = () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePassBtn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    };
  }

  // Handle Login submission
  const loginForm = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-login-btn');
  const btnText = document.getElementById('btn-text');
  const errorAlert = document.getElementById('login-error-alert');
  const errorText = document.getElementById('login-error-text');

  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }

      // UI Loading state
      submitBtn.disabled = true;
      btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
      if (errorAlert) errorAlert.style.display = 'none';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed. Please verify credentials.');
        }

        showToast(`Welcome back, ${data.user.name}!`, 'success', 'Login Successful');
        
        // Role-based routing
        setTimeout(() => {
          redirectToRoleHome(data.user.role);
        }, 500);

      } catch (err) {
        showError(err.message || 'Login failed. Please check credentials.');
        submitBtn.disabled = false;
        btnText.textContent = 'Sign In';
      }
    };
  }

  function showError(msg) {
    if (errorAlert && errorText) {
      errorText.textContent = msg;
      errorAlert.style.display = 'flex';
      
      // Shake effect on card
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
