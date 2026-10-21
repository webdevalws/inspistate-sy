import { useState } from 'react';

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split('#')[0];
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled — fall back to copy */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }
  return <button type="button" onClick={share} className="btn-ghost">{copied ? '✓ Link copied' : '↗ Share'}</button>;
}
