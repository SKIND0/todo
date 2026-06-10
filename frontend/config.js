(function () {
  if (window.CHECKMARK_API_URL) return;

  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1';

  // Local dev: frontend and backend run on different ports.
  // Production: frontend is served by the same FastAPI service.
  window.CHECKMARK_API_URL = isLocal ? 'http://localhost:8000' : window.location.origin;
})();
