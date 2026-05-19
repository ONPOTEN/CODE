'use client';

import React, { useEffect, useRef } from 'react';
import { loadAdsenseScript, pushAdsbygoogle } from '@/lib/adsense';

interface PostContentProps {
  content: string;
  className?: string;
}

/**
 * PostContent Component
 * Renders HTML content and ensures <script> tags are executed.
 * This is essential for Google AdSense and other embedded scripts in a React environment.
 */
const PostContent: React.FC<PostContentProps> = ({ content, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-process content to handle escaped tags or editor-injected divs
  const processedContent = React.useMemo(() => {
    if (!content) return '';
    
    let text = content;
    
    // 1. Handle common editor mangling: replace <div>&lt;script...&gt;</div> with real tags
    // This often happens when users paste code into a WYSIWYG editor
    text = text.replace(/<div[^>]*>\s*&lt;script/gi, '<script')
               .replace(/&lt;\/script&gt;\s*<\/div>/gi, '</script>')
               .replace(/<div[^>]*>\s*&lt;\/script&gt;\s*<\/div>/gi, '</script>')
               .replace(/<div>\s*<\/script>/gi, '</script>')
               .replace(/<div[^>]*>\s*<\/script>\s*<\/div>/gi, '</script>')
               .replace(/&lt;script/gi, '<script')
               .replace(/&lt;\/script&gt;/gi, '</script>')
               .replace(/&lt;ins/gi, '<ins')
               .replace(/&lt;\/ins&gt;/gi, '</ins>')
               .replace(/&lt;!/g, '<!')
               .replace(/--&gt;/g, '-->')
               .replace(/&quot;/g, '"')
               .replace(/&amp;/g, '&')
               .replace(/&gt;/g, '>');

    // Repair malformed opening tags if upstream formatting injected <br> between attributes.
    text = text.replace(/<(script|ins)\b([\s\S]*?)>/gi, (_match, tag, attrs) => {
      const normalizedAttrs = attrs
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag}${normalizedAttrs ? ` ${normalizedAttrs}` : ''}>`;
    });

    // Remove accidental <br> directly inside script tags.
    text = text.replace(/<script([^>]*)>\s*(<br\s*\/?>\s*)+/gi, '<script$1>')
               .replace(/(<br\s*\/?>\s*)+<\/script>/gi, '</script>');
               
    return text;
  }, [content]);

  useEffect(() => {
    if (!containerRef.current || !processedContent) return;

    const appendedScripts: HTMLScriptElement[] = [];

    // Find all script tags in the newly rendered content
    const scripts = containerRef.current.querySelectorAll('script');
    
    scripts.forEach((oldScript) => {
      // Skip if already processed
      if (oldScript.getAttribute('data-processed')) return;

      const newScript = document.createElement('script');
      
      // Copy attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy inline script content
      const inlineCode = oldScript.innerHTML || '';

      // Avoid double-running AdSense push from pasted snippets. We initialize slots below.
      if (!newScript.src && /adsbygoogle\s*=\s*window\.adsbygoogle|adsbygoogle\s*\)\s*\.push\s*\(\s*\{\s*\}\s*\)/i.test(inlineCode)) {
        oldScript.setAttribute('data-processed', 'true');
        oldScript.style.display = 'none';
        return;
      }

      // Ignore pasted AdSense loader scripts in post content. A shared loader handles it once globally.
      if (newScript.src && /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(newScript.src)) {
        oldScript.setAttribute('data-processed', 'true');
        oldScript.style.display = 'none';
        return;
      }

      newScript.appendChild(document.createTextNode(inlineCode));
      
      // Mark as processed to avoid double execution
      oldScript.setAttribute('data-processed', 'true');
      oldScript.style.display = 'none'; // Hide the original script tag

      // Replace or append
      if (newScript.src) {
        const existingScript = document.querySelector(`script[src="${newScript.src}"]`);
        if (!existingScript) {
          document.body.appendChild(newScript);
          appendedScripts.push(newScript);
        }
      } else {
        oldScript.parentNode?.insertBefore(newScript, oldScript.nextSibling);
      }
    });

    // Initialize Google Ads blocks in post content.
    const adSlots = containerRef.current.querySelectorAll('ins.adsbygoogle');
    if (adSlots.length > 0) {
      loadAdsenseScript().then((loaded) => {
        if (!loaded) {
          return;
        }

        adSlots.forEach((slot) => {
          pushAdsbygoogle(slot as HTMLElement);
        });
      });
    }

    return () => {
      appendedScripts.forEach((script) => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, [processedContent]);

  return (
    <div 
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
};

export default PostContent;
