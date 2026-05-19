'use client';

const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8350902137868521';
const ADSENSE_SELECTOR = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';

type AdSenseStatus = 'idle' | 'loading' | 'loaded' | 'failed';

declare global {
  interface Window {
    __adsenseScriptStatus?: AdSenseStatus;
    __adsenseScriptPromise?: Promise<boolean>;
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

function shouldLoadAdsense(): boolean {
  if (typeof window === 'undefined') {
    console.debug('[AdSense] shouldLoadAdsense: window undefined (SSR)');
    return false;
  }

  const enabledFlag = (process.env.NEXT_PUBLIC_ENABLE_ADSENSE || '').toLowerCase();
  const isExplicitlyEnabled = enabledFlag === '1' || enabledFlag === 'true' || enabledFlag === 'yes' || enabledFlag === 'on';

  console.debug('[AdSense] shouldLoadAdsense: NEXT_PUBLIC_ENABLE_ADSENSE =', JSON.stringify(enabledFlag), '| enabled =', isExplicitlyEnabled);

  // Require explicit opt-in to avoid noisy errors in development or test environments.
  if (!isExplicitlyEnabled) {
    return false;
  }

  return true;
}

function setStatus(status: AdSenseStatus) {
  if (typeof window !== 'undefined') {
    window.__adsenseScriptStatus = status;
  }
}

export function getAdsenseStatus(): AdSenseStatus {
  if (typeof window === 'undefined') {
    return 'idle';
  }
  return window.__adsenseScriptStatus || 'idle';
}

export function loadAdsenseScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    console.debug('[AdSense] loadAdsenseScript: SSR, skipping');
    return Promise.resolve(false);
  }

  if (!shouldLoadAdsense()) {
    console.debug('[AdSense] loadAdsenseScript: shouldLoadAdsense=false, aborting');
    setStatus('failed');
    return Promise.resolve(false);
  }

  if (window.__adsenseScriptStatus === 'loaded') {
    console.debug('[AdSense] loadAdsenseScript: already loaded');
    return Promise.resolve(true);
  }

  if (Array.isArray(window.adsbygoogle)) {
    console.debug('[AdSense] loadAdsenseScript: window.adsbygoogle exists, marking loaded');
    setStatus('loaded');
    return Promise.resolve(true);
  }

  if (window.__adsenseScriptStatus === 'failed') {
    console.debug('[AdSense] loadAdsenseScript: previously failed');
    return Promise.resolve(false);
  }

  if (window.__adsenseScriptPromise) {
    console.debug('[AdSense] loadAdsenseScript: reusing existing promise');
    return window.__adsenseScriptPromise;
  }

  console.debug('[AdSense] loadAdsenseScript: injecting script tag');
  setStatus('loading');

  window.__adsenseScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector(ADSENSE_SELECTOR) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      console.debug('[AdSense] script finish: ok =', ok);
      setStatus(ok ? 'loaded' : 'failed');
      resolve(ok);
    };

    const onLoad = () => { console.debug('[AdSense] script onload fired'); finish(true); };
    const onError = (e: Event) => { console.debug('[AdSense] script onerror fired', e); finish(false); };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    if (!existing) {
      script.async = true;
      script.src = ADSENSE_SRC;
      console.debug('[AdSense] appending script to head:', script.src);
      document.head.appendChild(script);
    } else {
      console.debug('[AdSense] script tag already exists in DOM, waiting for events');
    }

    // If the browser drops the request (status null/CORS/network block), resolve gracefully.
    window.setTimeout(() => {
      if (window.__adsenseScriptStatus === 'loading') {
        console.debug('[AdSense] 8s timeout — script still loading, forcing failed');
        finish(false);
      }
    }, 8000);
  });

  return window.__adsenseScriptPromise;
}

export function pushAdsbygoogle(slot: HTMLElement): boolean {
  if (typeof window === 'undefined') {
    console.debug('[AdSense] pushAdsbygoogle: SSR, skipping');
    return false;
  }

  if (window.__adsenseScriptStatus !== 'loaded') {
    console.debug('[AdSense] pushAdsbygoogle: script not loaded, status =', window.__adsenseScriptStatus);
    return false;
  }

  if (slot.getAttribute('data-adsbygoogle-status')) {
    console.debug('[AdSense] pushAdsbygoogle: slot already initialized, status =', slot.getAttribute('data-adsbygoogle-status'));
    return true;
  }

  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
    console.debug('[AdSense] pushAdsbygoogle: pushed to adsbygoogle array, slot =', slot.dataset.adSlot);
    return true;
  } catch (err) {
    console.debug('[AdSense] pushAdsbygoogle: push threw error', err);
    return false;
  }
}
