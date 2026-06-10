// login.js — Login page logic
// Vanilla JS, no frameworks.

// ── Config ───────────────────────────────────────────────────────────────────
// Set window.CHECKMARK_API_URL before this script loads to override in production.
const API_URL = window.CHECKMARK_API_URL || 'http://localhost:8000';

// ── Google OAuth token pickup ─────────────────────────────────────────────────
// After Google OAuth the backend redirects to /login.html?token=...
// Grab the token, store it, and head straight to the app.
(function () {
  var params = new URLSearchParams(window.location.search);
  var token  = params.get('token');
  if (token) {
    localStorage.setItem('checkmark-token', token);
    window.location.replace('/app.html');
  }
})();

// ── Redirect if already logged in ────────────────────────────────────────────
if (localStorage.getItem('checkmark-token')) {
  window.location.replace('/app.html');
}

// Google OAuth lives on the backend, not the static frontend server
(function () {
  var link = document.querySelector('a.btn-google');
  if (link) link.href = API_URL + '/auth/google';
})();

// ── Login form ────────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var errorEl  = document.getElementById('login-error');
  var btn      = e.target.querySelector('button[type="submit"]');

  errorEl.classList.add('hidden');
  btn.disabled    = true;
  btn.textContent = 'Logging in…';

  try {
    var res = await fetch(API_URL + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email, password: password }),
    });

    var data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.detail || 'Login failed. Please try again.';
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
    btn.textContent = 'Log in';
  }
});
