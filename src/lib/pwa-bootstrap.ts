// Runs before the first paint: viewport width alone must not block desktop users.
export const pwaBootstrap = `(() => {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const mobile = ios || /Android|Mobile/i.test(navigator.userAgent);
  const refresh = () => {
    const installed = navigator.standalone === true ||
      matchMedia('(display-mode: standalone)').matches ||
      matchMedia('(display-mode: fullscreen)').matches;
    document.documentElement.dataset.pwaMode = installed ? 'standalone' : mobile ? (ios ? 'ios' : 'android') : 'desktop';
  };
  refresh();
  ['standalone', 'fullscreen'].forEach(mode => matchMedia('(display-mode: ' + mode + ')').addEventListener('change', refresh));
  addEventListener('pageshow', refresh);
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.__portalInstallPrompt = event;
  });
  addEventListener('appinstalled', () => { window.__portalInstallPrompt = undefined; refresh(); });
})();`;
