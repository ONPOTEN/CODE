'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

export default function AdsTestPage() {
  const adRef = useRef<HTMLModElement | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [log, setLog] = useState('waiting');
  const [status, setStatus] = useState('not-set');
  const [title, setTitle] = useState('');
  const [display, setDisplay] = useState('');
  const [visibility, setVisibility] = useState('');
  const [size, setSize] = useState('0x0');

  const updateDiagnostics = () => {
    if (!adRef.current) return;

    const style = window.getComputedStyle(adRef.current);
    setStatus(adRef.current.getAttribute('data-adsbygoogle-status') || 'not-set');
    setTitle(adRef.current.getAttribute('title') || '');
    setDisplay(style.display);
    setVisibility(style.visibility);
    setSize(`${adRef.current.offsetWidth}x${adRef.current.offsetHeight}`);
  };

  const pushAd = () => {
    if (!adRef.current) {
      setLog('no ad element found');
      return;
    }

    const width = adRef.current.offsetWidth;
    if (width <= 0) {
      setLog('skip push: width is 0');
      updateDiagnostics();
      return;
    }

    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
      setLog('push sent');
    } catch (err) {
      setLog(`push error: ${String(err)}`);
    } finally {
      window.setTimeout(updateDiagnostics, 1000);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(updateDiagnostics, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scriptLoaded) return;

    const timer = window.setTimeout(() => {
      pushAd();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [scriptLoaded]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Ads Test Mode</h1>
      <p className="text-sm text-gray-600 mb-6">
        Raw AdSense test page for slot 2027584221. Use this page to verify if blockers, CSP, or layout are causing failures.
      </p>

      <Script
        id="adsbygoogle-test-script"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8350902137868521"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
          setLog('script loaded');
        }}
        onError={() => {
          setLog('script failed to load (possibly blocked)');
        }}
      />

      <div className="rounded-lg border border-gray-300 bg-white p-4 mb-6">
        <div className="font-semibold mb-3">Ad Slot</div>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', minHeight: '90px' }}
          data-ad-client="ca-pub-8350902137868521"
          data-ad-slot="2027584221"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <div className="font-semibold mb-2">Diagnostics</div>
        <div>scriptLoaded: {String(scriptLoaded)}</div>
        <div>status: {status}</div>
        <div>title: {title || '(empty)'}</div>
        <div>display: {display || '(unknown)'}</div>
        <div>visibility: {visibility || '(unknown)'}</div>
        <div>size: {size}</div>
        <div>log: {log}</div>

        <button
          onClick={pushAd}
          className="mt-3 rounded-md bg-black text-white px-3 py-2 text-xs"
        >
          Retry adsbygoogle.push
        </button>
      </div>
    </main>
  );
}
