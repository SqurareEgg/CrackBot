import React from 'react';
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

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="#1D9E75" strokeWidth="1.5"/>
        <path d="M6 7l3 3 5-5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    text: '6대 결함 AI 자동 탐지',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h14M10 3v14" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="7" stroke="#1D9E75" strokeWidth="1.5"/>
      </svg>
    ),
    text: '균열 폭 0.1mm 단위 측정',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12 2H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7l-3-5Z" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 2v5h3" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 12h6M7 9h4" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    text: '보고서 자동 생성 (PDF/DOCX)',
  },
];

export default function OnboardingDoneScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <StatusBar />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <StepDots active={3} total={3} />

        {/* Green checkmark circle */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#E1F5EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path
              d="M9 18l6 6 12-12"
              stroke="#1D9E75"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          준비 완료!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, textAlign: 'center' }}>
          CrackBot AI를 사용할 준비가 되었습니다
        </p>

        {/* Feature card */}
        <div
          style={{
            width: '100%',
            background: 'var(--bg-secondary)',
            borderRadius: 16,
            padding: '20px',
            marginBottom: 32,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>
            주요 기능
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#E1F5EE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={() => { localStorage.setItem('onboarding_done', 'true'); navigate('/home'); }} style={{ width: '100%' }}>
          점검 시작하기
        </button>
      </div>
    </div>
  );
}
