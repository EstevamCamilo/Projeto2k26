if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker
        .register(new URL('../sw.js', import.meta.url), {
          scope: new URL('../', import.meta.url).pathname,
        })
        .then((registration) => {
          if (registration.waiting && navigator.serviceWorker.controller)
            notifyUpdate(registration);
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller)
                notifyUpdate(registration);
            });
          });
        })
        .catch(() => {
          /* All online tools remain usable if offline storage is denied. */
        });
    },
    { once: true }
  );
}
function notifyUpdate(registration) {
  const banner = document.createElement('div');
  banner.className = 'qvc-update-notice qvc-no-print';
  banner.setAttribute('role', 'status');
  banner.textContent = 'Uma nova versão está disponível. Guarde seu trabalho antes de atualizar. ';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'qvc-button';
  button.textContent = 'Atualizar';
  button.addEventListener('click', () => {
    registration.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' });
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {
      once: true,
    });
  });
  banner.append(button);
  document.body.append(banner);
}
