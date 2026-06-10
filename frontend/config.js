// Production API URL — set this to your Railway backend's public URL (no trailing slash).
// Find it in Railway → backend service → Settings → Networking → Public domain.
var PRODUCTION_API_URL = 'https://backend-production-18a7.up.railway.app/';

(function () {
  if (window.CHECKMARK_API_URL) return;

  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1';

  window.CHECKMARK_API_URL = isLocal ? 'http://localhost:8000' : PRODUCTION_API_URL;
})();
