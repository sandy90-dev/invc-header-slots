// Preload — intentionally minimal, contextIsolation is on
// No node APIs exposed to renderer; the app talks to Express via fetch/SSE
window.addEventListener('DOMContentLoaded', () => {
  // Nothing needed — renderer uses standard fetch/EventSource against localhost
});
