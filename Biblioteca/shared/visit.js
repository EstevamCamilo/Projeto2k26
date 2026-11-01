import { tools } from './catalog.js';
import { recordVisit } from './hub-state.js';
const base = new URL('../', import.meta.url);
function track() {
  const current = new URL(location.href);
  const tool = tools.find((t) => {
    const url = new URL(t.path, base);
    return (
      url.pathname === current.pathname &&
      url.search === current.search &&
      (!url.hash || url.hash === current.hash)
    );
  });
  if (tool) recordVisit(tool);
}
track();
window.addEventListener('hashchange', track);
