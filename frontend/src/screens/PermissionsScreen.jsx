import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';

function StepDots({ active, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === active - 1 ? 20 : 8,
            height: 8,
            borderRadius: 99,
            background: i === active - 1 ? '#1D9E75' : 'var(--border-secondary)',
            transition: 'width 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        background: on ? '#1D9E75' : 'var(--border-secondary)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

export default function PermissionsScreen() {
  const navigate = useNavigate();
  const [camera, setCamera] = useState(false);
  const [location, setLocation] = useState(false);
  const [storage, setStorage] = useState(false);

  const requestCamera = async (enabled) => {
    if (!enabled) { setCamera(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCamera(true);
    } catch {
      setCamera(false);
      alert('카메라 권한을 브라우저에서 허용해주세요.');
    }
  };

  const requestLocation = (enabled) => {
    if (!enabled) { setLocation(false); return; }
    navigator.geolocation.getCurrentPosition(
      () => setLocation(true),
      () => { setLocation(false); alert('위치 권한을 브라우저에서 허용해주세요.'); },
    );
  };

  const permissions = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M19 15a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-2.5h4L14 5h3a2 2 0 0 1 2 2v8Z" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/>
          <circle cx="10" cy="11" r="3" stroke="#1D9E75" strokeWidth="1.5"/>
        </svg>
      ),
      label: '카메라',
      desc: '균열 사진 촬영에 필요합니다',
      value: camera,
      onChange: requestCamera,
      color: '#1D9E75',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2C7.24 2 5 4.24 5 7c0 4 5 11 5 11s5-7 5-11c0-2.76-2.24-5-5-5Z" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/>
          <circle cx="10" cy="7" r="2" stroke="#1D9E75" strokeWidth="1.5"/>
        </svg>
      ),
      label: '위치(GPS)',
      desc: '점검 위치 자동 태깅에 필요합니다',
      value: location,
      onChange: requestLocation,
      color: '#1D9E75',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="var(--text-secondary)" strokeWidth="1.5"/>
          <path d="M7 10h6M10 7v6" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      label: '저장소',
      desc: '사진 및 보고서 저장에 필요합니다',
      value: storage,
      onChange: setStorage,
      color: 'var(--text-secondary)',
    },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 32px' }}>
        <StepDots active={1} total={3} />

        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          앱 사용 권한 설정
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5 }}>
          CrackBot AI 사용에 필요한 권한을 허용해 주세요
        </p>

        {/* Permission rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {permissions.map((p) => (
            <div
              key={p.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid var(--border-tertiary)',
                background: 'var(--bg-primary)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {p.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{p.desc}</div>
              </div>
              <Toggle on={p.value} onChange={p.onChange} />
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={() => navigate('/onboarding-done')} style={{ marginBottom: 14 }}>
          다음
        </button>
        <button
          onClick={() => navigate('/onboarding-done')}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            fontSize: 14,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '10px',
          }}
        >
          나중에 설정
        </button>
      </div>
    </div>
  );
}
