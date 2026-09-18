import React from 'react';
import { useResponsive } from '../hooks/useResponsive.js';

export default function StatusBar({ dark = false }) {
  const { isDesktop } = useResponsive();
  if (isDesktop) return null;

  const color = dark ? '#ffffff' : 'var(--text-primary)';
  const bg = dark ? 'transparent' : 'var(--bg-secondary)';

  return (
    <div
      style={{
        height: 28,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color, letterSpacing: 0.2 }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="1" fill={color} />
          <rect x="4.5" y="5" width="3" height="7" rx="1" fill={color} />
          <rect x="9" y="2" width="3" height="10" rx="1" fill={color} />
          <rect x="13.5" y="0" width="3" height="12" rx="1" fill={color} opacity="0.3" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke={color} strokeOpacity="0.5" />
          <rect x="2" y="2" width="15" height="8" rx="1.5" fill={color} />
          <path d="M22.5 4v4a2 2 0 0 0 0-4Z" fill={color} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}
