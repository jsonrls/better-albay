'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAManager() {
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const waitingWorker = useRef<ServiceWorker | null>(null);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setShowInstall(false);
  }, []);

  const handleUpdate = useCallback(() => {
    waitingWorker.current?.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdate(false);
  }, []);

  useEffect(() => {
    // Install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone;
      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem('pwa-install-dismissed') === '1';
      } catch {}
      if (!isStandalone && !dismissed) {
        setShowInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    let updateInterval: ReturnType<typeof setInterval> | undefined;
    let disposed = false;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    // Service worker registration + update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (!reg || disposed) return;
          updateInterval = setInterval(
            () => {
              reg.update().catch((error) => console.warn('Service worker update failed', error));
            },
            30 * 60 * 1000
          );

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                waitingWorker.current = newWorker;
                setShowUpdate(true);
              }
            });
          });
        })
        .catch((error) => console.warn('Service worker registration unavailable', error));

      // Seamless reload on controller change
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    return () => {
      disposed = true;
      if (updateInterval) clearInterval(updateInterval);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return (
    <>
      {showInstall && (
        <div className="pwa-install-banner" role="alert" aria-live="polite">
          <div className="pwa-install-content">
            <i className="bi bi-download" aria-hidden="true"></i>
            <span>Install BetterAlbay for quick access to services.</span>
          </div>
          <div className="pwa-install-actions">
            <button
              className="pwa-install-btn"
              onClick={handleInstall}
              aria-label="Install BetterAlbay app"
            >
              Install
            </button>
            <button
              className="pwa-install-dismiss"
              onClick={() => {
                try {
                  sessionStorage.setItem('pwa-install-dismissed', '1');
                } catch {}
                setShowInstall(false);
              }}
              aria-label="Dismiss install prompt"
            >
              &times;
            </button>
          </div>
        </div>
      )}
      {showUpdate && (
        <div className="sw-update-banner" role="alert" aria-live="polite">
          <span>A new version is available.</span>
          <button className="sw-update-btn" onClick={handleUpdate} aria-label="Update now">
            Update
          </button>
          <button
            className="sw-update-dismiss"
            onClick={() => setShowUpdate(false)}
            aria-label="Dismiss update notice"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}
