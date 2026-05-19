'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadAdsenseScript, pushAdsbygoogle } from '@/lib/adsense';

interface AdSenseBlockProps {
  client: string;
  slot: string;
  format?: string;
  responsive?: string;
  className?: string;
  minHeight?: number;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

type AdState = 'loading' | 'filled' | 'fallback';
type TraceEntry = { time: number; msg: string; data?: Record<string, unknown> };

function useDebugMode(): boolean {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get('adsense_debug') === '1');
  }, []);
  return debug;
}

const AdSenseBlock: React.FC<AdSenseBlockProps> = ({
  client,
  slot,
  format = 'auto',
  responsive = 'true',
  className = '',
  minHeight = 90,
  fallbackTitle = 'Quang cao',
  fallbackDescription = 'Vi tri quang cao dang chua co noi dung hien thi.',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const [adState, setAdState] = useState<AdState>('loading');
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const debugMode = useDebugMode();
  const t0 = useRef<number>(Date.now());

  const addTrace = (msg: string, data?: Record<string, unknown>) => {
    const entry: TraceEntry = { time: Date.now() - t0.current, msg, data };
    console.debug(`[AdSenseBlock +${entry.time}ms] ${msg}`, data ?? '');
    setTrace(prev => [...prev, entry]);
  };

  const checkAdState = () => {
    if (!adRef.current) return;

    const status = adRef.current.getAttribute('data-adsbygoogle-status') || 'not-set';
    const adStatus = adRef.current.getAttribute('data-ad-status') || 'not-set';
    const iframe = adRef.current.querySelector('iframe') as HTMLIFrameElement | null;
    const hasVisibleIframe = Boolean(iframe && iframe.offsetWidth > 0 && iframe.offsetHeight > 0);
    const computedDisplay = window.getComputedStyle(adRef.current).display;

    const isFilled = hasVisibleIframe;
    // AdSense inconsistently sets data-ad-status="unfilled". Detect it via secondary signals:
    // - status="done" with no visible iframe (normal unfilled path)
    // - display:none set by AdSense without injecting an iframe (silent collapse path)
    const isUnfilled =
      adStatus === 'unfilled' ||
      (status === 'done' && !hasVisibleIframe) ||
      (computedDisplay === 'none' && status !== 'not-set' && !hasVisibleIframe);

    // Normalize: write the attribute ourselves so subsequent checks are consistent
    // and the MutationObserver doesn't keep firing on unrelated style mutations.
    if (isUnfilled && adStatus !== 'unfilled' && adRef.current) {
      adRef.current.setAttribute('data-ad-status', 'unfilled');
    }

    const nextState: AdState = isFilled ? 'filled' : isUnfilled ? 'fallback' : 'loading';

    addTrace('checkAdState', {
      status, adStatus, hasVisibleIframe, computedDisplay,
      iframeCount: adRef.current.querySelectorAll('iframe').length,
      insWidth: adRef.current.offsetWidth,
      insHeight: adRef.current.offsetHeight,
      parentWidth: adRef.current.parentElement?.clientWidth,
      nextState,
      normalizedUnfilled: isUnfilled && adStatus !== 'unfilled',
    });

    if (nextState !== 'loading') {
      setAdState(nextState);
    }
  };

  useEffect(() => {
    t0.current = Date.now();
    addTrace('useEffect mount', { client, slot });
    let cancelled = false;
    let fallbackTimer: number | null = null;
    let mutationObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    loadAdsenseScript().then((loaded) => {
      addTrace('loadAdsenseScript resolved', { loaded, hasRef: Boolean(adRef.current) });
      if (cancelled) return;

      if (!loaded || !adRef.current) {
        addTrace('FAIL: script not loaded or ref missing', { loaded });
        setAdState('fallback');
        return;
      }

      // Double-rAF: wait for layout+paint before measuring & pushing.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled || !adRef.current) return;

          const prePushWidth = adRef.current.offsetWidth;
          addTrace('pre-push dimensions', {
            prePushWidth,
            prePushHeight: adRef.current.offsetHeight,
            parentWidth: adRef.current.parentElement?.clientWidth,
          });

          // If the element still has no width, explicitly size it so AdSense doesn't skip it.
          if (prePushWidth === 0) {
            const parentW = adRef.current.parentElement?.clientWidth;
            adRef.current.style.width = parentW ? `${parentW}px` : '100%';
            adRef.current.style.display = 'block';
            addTrace('forced explicit width before push', { width: adRef.current.style.width });
          }

          const initialized = pushAdsbygoogle(adRef.current);
          addTrace('pushAdsbygoogle returned', { initialized });

          if (!initialized) {
            setAdState('fallback');
            return;
          }

          mutationObserver = new MutationObserver(() => checkAdState());
          mutationObserver.observe(adRef.current, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['data-adsbygoogle-status', 'data-ad-status', 'style', 'class'],
          });

          resizeObserver = new ResizeObserver(() => checkAdState());
          resizeObserver.observe(adRef.current);

          // Safety-net: if AdSense never fires, fall back after 4s.
          fallbackTimer = window.setTimeout(() => {
            addTrace('safety-net timeout fired');
            checkAdState();
            // If still loading after timeout, force fallback.
            setAdState(prev => prev === 'loading' ? 'fallback' : prev);
          }, 4000);
        });
      });
    });

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [client, slot]);

  const showIns = adState !== 'fallback';

  return (
    <div className={`ad-container relative my-6 w-full ${className}`} style={{ minHeight: `${minHeight}px` }}>

      {/* The <ins> stays in the DOM until we confirm fallback so AdSense can process it */}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: showIns ? 'block' : 'none',
          width: '100%',
          minHeight: `${minHeight}px`,
        }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />

      {/* Loading skeleton — visible while AdSense is processing */}
      {adState === 'loading' && (
        <div
          className="absolute inset-0 overflow-hidden rounded-lg bg-gray-100"
          style={{ minHeight: `${minHeight}px` }}
        >
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%]" />
          <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">Advertisement</span>
        </div>
      )}

      {/* Fallback — shown when AdSense returns no fill */}
      {adState === 'fallback' && (
        <div
          className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm"
          style={{ minHeight: `${minHeight}px` }}
        >
          <div className="flex h-full min-h-[inherit] flex-col justify-center px-5 py-6 text-center">
            <div className="mx-auto inline-flex items-center rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
              Sponsored Content
            </div>
            <p className="mt-4 text-base font-semibold text-gray-900">{fallbackTitle}</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">{fallbackDescription}</p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Ad space reserved for partner messaging</span>
            </div>
          </div>
        </div>
      )}

      {debugMode && (
        <details
          open
          className="mt-2 rounded border border-blue-300 bg-blue-50 p-2 text-[11px] font-mono text-blue-900"
        >
          <summary className="cursor-pointer font-semibold">
            [AdSense Debug] slot={slot} | adState={adState}
          </summary>
          <div className="mt-1 max-h-64 overflow-y-auto space-y-0.5">
            {trace.map((e, i) => (
              <div key={i} className="border-b border-blue-200 pb-0.5">
                <span className="text-blue-500">+{e.time}ms</span>{' '}
                <span className="font-semibold">{e.msg}</span>
                {e.data && (
                  <pre className="whitespace-pre-wrap text-[10px] text-blue-700">
                    {JSON.stringify(e.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {trace.length === 0 && <div className="text-blue-400 italic">No trace entries yet…</div>}
          </div>
        </details>
      )}
    </div>
  );
};

export default AdSenseBlock;
