import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { getUser, clearToken } from '../api/client.js';

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 10,
        background: active ? 'var(--primary-light)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        color: active ? 'var(--primary)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}

function HomeIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function InspectIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="3" stroke={c} strokeWidth="1.6" />
      <path d="M7 8h8M7 11h8M7 14h5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke={c} strokeWidth="1.6" />
    </svg>
  );
}

function ReportIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M13 3H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-4-5Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 3v5h4" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 13h6M8 10h4" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  const c = active ? '#1D9E75' : 'var(--text-secondary)';
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke={c} strokeWidth="1.6" />
      <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const navItems = [
  { label: '홈', path: '/home', Icon: HomeIcon },
  { label: '점검 프로젝트', path: '/projects', Icon: InspectIcon },
  { label: '촬영 / 분석', path: '/camera', Icon: CameraIcon },
  { label: '보고서', path: '/reports', Icon: ReportIcon },
  { label: '내 정보', path: '/profile', Icon: ProfileIcon },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const isActive = (path) => {
    if (path === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div style={{
      width: 240,
      flexShrink: 0,
      height: '100vh',
      background: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-tertiary)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-tertiary)' }}>
        <Logo size={36} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>CrackBot</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>균열 탐지 시스템</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navItems.map(({ label, path, Icon }) => (
          <NavItem
            key={path}
            icon={<Icon active={isActive(path)} />}
            label={label}
            active={isActive(path)}
            onClick={() => navigate(path)}
          />
        ))}
      </nav>

      {/* User info */}
      <div style={{ padding: '16px 16px 20px', borderTop: '1px solid var(--border-tertiary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.slice(0, 2) || 'CB'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || '점검사'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', padding: '8px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-tertiary)', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
