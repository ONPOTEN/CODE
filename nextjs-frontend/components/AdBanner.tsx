'use client';

import { useEffect, useRef, useState } from 'react';
import { loadAdsenseScript, pushAdsbygoogle } from '@/lib/adsense';

interface AdBannerProps {
  adSlot?: string;
}

export default function AdBanner({ adSlot = '2027584221' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    scriptLoaded: false,
    adStatus: 'unknown',
    title: '',
    display: '',
    visibility: '',
    width: 0,
    height: 0,
    blockedReason: 'none',
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const debugFlag = searchParams.get('ads_debug') === '1' || window.localStorage.getItem('ads_debug') === '1';
    setIsDebugEnabled(debugFlag);

    loadAdsenseScript().then((loaded) => {
      setIsScriptLoaded(loaded);
      if (!loaded) {
        setIsBlocked(true);
        setDebugInfo((prev: typeof debugInfo) => ({
          ...prev,
          scriptLoaded: false,
          blockedReason: 'script-load-failed',
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (!isScriptLoaded || typeof window === 'undefined' || !adRef.current || isInitialized) {
      return;
    }

    let isCancelled = false;
    let retryCount = 0;
    const maxRetries = 20;
    let retryTimer: number | null = null;

    const updateDebugAndBlockState = () => {
      if (!adRef.current) {
        return;
      }

      const computedStyle = window.getComputedStyle(adRef.current);
      const title = adRef.current.getAttribute('title') || '';
      const adStatus = adRef.current.getAttribute('data-adsbygoogle-status') || 'not-set';
      const hasNoLayout = adRef.current.offsetHeight === 0 && adRef.current.offsetWidth === 0;
      // Only treat as blocked when a browser extension explicitly marks it (title contains 'blocked').
      // Do NOT use hiddenByStyle — AdSense itself sets display:none while loading or when no ad fills,
      // which would cause a false-positive and collapse the slot before the ad has a chance to render.
      const blockedByExtension = title.toLowerCase().includes('blocked');
      const blockedReason = blockedByExtension
        ? 'selector-filter'
        : hasNoLayout
          ? 'zero-layout'
          : 'none';

      setDebugInfo({
        scriptLoaded: true,
        adStatus,
        title,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        width: adRef.current.offsetWidth,
        height: adRef.current.offsetHeight,
        blockedReason,
      });

      if (blockedByExtension) {
        setIsBlocked(true);
      }
    };

    const tryInitAd = () => {
      if (isCancelled || !adRef.current) {
        return;
      }

      const width = adRef.current.offsetWidth;
      const alreadyInitialized = adRef.current.getAttribute('data-adsbygoogle-status');

      if (alreadyInitialized) {
        setIsInitialized(true);
        updateDebugAndBlockState();
        return;
      }

      if (width <= 0) {
        retryCount += 1;
        updateDebugAndBlockState();

        if (retryCount <= maxRetries) {
          retryTimer = window.setTimeout(tryInitAd, 250);
        }
        return;
      }

      try {
        if (pushAdsbygoogle(adRef.current)) {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Adsense error:', err);
      } finally {
        window.setTimeout(updateDebugAndBlockState, 1200);
      }
    };

    tryInitAd();

    const resizeObserver = new ResizeObserver(() => {
      if (!isInitialized) {
        tryInitAd();
      }
    });
    resizeObserver.observe(adRef.current);

    // Watch for browser extensions setting title="Blocked (selector): " on the ins element
    const mutationObserver = new MutationObserver(() => {
      updateDebugAndBlockState();
    });
    mutationObserver.observe(adRef.current, {
      attributes: true,
      attributeFilter: ['title', 'style', 'class'],
    });

    return () => {
      isCancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [isScriptLoaded, adSlot, isInitialized]);

  return (
    <div className={isBlocked && !isDebugEnabled ? 'hidden' : `w-full text-center my-4 overflow-hidden${isBlocked ? '' : ' min-h-[90px]'}`}>
      {/* Fallback message removed so it fails silently */}
      <ins
        key={adSlot}
        ref={adRef}
        className="adsbygoogle"
        style={{ display: isBlocked ? 'none' : 'block' }}
        data-ad-client="ca-pub-8350902137868521"
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
      {isDebugEnabled && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
          <div className="font-semibold">Ads Debug</div>
          <div>slot: {adSlot}</div>
          <div>scriptLoaded: {String(debugInfo.scriptLoaded)}</div>
          <div>status: {debugInfo.adStatus}</div>
          <div>title: {debugInfo.title || '(empty)'}</div>
          <div>display: {debugInfo.display || '(unknown)'}</div>
          <div>visibility: {debugInfo.visibility || '(unknown)'}</div>
          <div>size: {debugInfo.width}x{debugInfo.height}</div>
          <div>blockedReason: {debugInfo.blockedReason}</div>
          <div className="mt-1 text-amber-700">Enable with ?ads_debug=1 or localStorage ads_debug=1</div>
        </div>
      )}
    </div>
  );
}
