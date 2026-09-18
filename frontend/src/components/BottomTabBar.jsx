import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive.js';

function HomeIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function InspectIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="3" stroke={c} strokeWidth="1.6" />
      <path d="M7 8h8M7 11h8M7 14h5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M13 3H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-4-5Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 3v5h4" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 13h6M8 10h4" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke={c} strokeWidth="1.6" />
      <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const tabs = [
  { label: '홈', path: '/home', icon: HomeIcon },
  { label: '점검', path: '/projects', icon: InspectIcon },
  { label: null, path: '/camera', icon: null },
  { label: '보고서', path: '/reports', icon: ReportIcon },
  { label: '내정보', path: '/profile', icon: ProfileIcon },
];

export default function BottomTabBar() {
  const { isDesktop } = useResponsive();
  const navigate = useNavigate();
  const location = useLocation();

  if (isDesktop) return null;

  const isActive = (path) => {
    if (path === '/home') return location.pathname === '/home';
    if (path === '/projects') return location.pathname.startsWith('/projects');
    if (path === '/reports') return location.pathname.startsWith('/reports');
    if (path === '/profile') return location.pathname === '/profile';
    return false;
  };

  return (
    <div
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTop: '1px solid var(--border-tertiary)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
        position: 'relative',
        paddingBottom: 4,
      }}
    >
      {tabs.map((tab) => {
        if (tab.path === '/camera') {
          return (
            <button
              key="camera-fab"
              onClick={() => navigate('/camera')}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#1D9E75',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                boxShadow: '0 4px 16px rgba(29,158,117,0.45)',
                marginBottom: 8,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" stroke="#fff" strokeWidth="1.8" />
              </svg>
            </button>
          );
        }

        const Icon = tab.icon;
        const active = isActive(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <Icon active={active} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? '#1D9E75' : 'var(--text-secondary)' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
