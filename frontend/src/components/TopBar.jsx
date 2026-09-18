import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive.js';

export default function TopBar({ title, onBack, rightContent, leftContent }) {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (isDesktop) {
    // On desktop, screens with their own header don't need TopBar.
    // Screens that use TopBar but don't have a custom desktop header (e.g. Create, Camera) still use it.
    return (
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        borderBottom: '1px solid var(--border-tertiary)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
        gap: 12,
      }}>
        {leftContent !== undefined ? (
          leftContent
        ) : onBack !== undefined ? (
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 13L5 8l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            뒤로
          </button>
        ) : null}

        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
          {title}
        </span>

        {rightContent && (
          <div>{rightContent}</div>
        )}
      </div>
    );
  }

  // Mobile
  return (
    <div
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-tertiary)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
        gap: 8,
      }}
    >
      <div style={{ width: 40, display: 'flex', alignItems: 'center' }}>
        {leftContent !== undefined ? (
          leftContent
        ) : onBack !== undefined ? (
          <button
            onClick={handleBack}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 13L5 8l5-5" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : null}
      </div>

      <div style={{ flex: 1, textAlign: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {title}
        </span>
      </div>

      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {rightContent || null}
      </div>
    </div>
  );
}
