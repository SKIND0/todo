// register.js — Register page logic
// Vanilla JS, no frameworks.

// ── Config ───────────────────────────────────────────────────────────────────
// Set window.CHECKMARK_API_URL before this script loads to override in production.
const API_URL = window.CHECKMARK_API_URL || 'http://localhost:8000';

// ── Redirect if already logged in ────────────────────────────────────────────
if (localStorage.getItem('checkmark-token')) {
  window.location.replace('/app.html');
}

// Google OAuth lives on the backend, not the static frontend server
(function () {
  var link = document.querySelector('a.btn-google');
  if (link) link.href = API_URL + '/auth/google';
})();

// ── Register form ─────────────────────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  var name     = document.getElementById('name').value.trim();
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var confirm  = document.getElementById('confirm-password').value;
  var errorEl  = document.getElementById('register-error');
  var btn      = e.target.querySelector('button[type="submit"]');

  errorEl.classList.add('hidden');

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  try {
    var res = await fetch(API_URL + '/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email, name: name, password: password }),
    });

    var data = await res.json();

    if (!res.ok) {
      // Pydantic 422 returns { detail: [{ msg: "..." }, ...] }
      var msg = Array.isArray(data.detail)
        ? data.detail.map(function (d) { return d.msg; }).join(' ')
        : (data.detail || 'Registration failed. Please try again.');
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      return;
    }

    localStorage.setItem('checkmark-token', data.access_token);
    window.location.replace('/app.html');

  } catch (_err) {
    errorEl.textContent = 'Could not reach the server. Please try again.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Create account';
  }
});
