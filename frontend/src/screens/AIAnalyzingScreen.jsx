import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import { detectCracks } from '../api/detection.js';
import { useResponsive } from '../hooks/useResponsive.js';

const STEPS = [
  '이미지 전처리',
  '객체 탐지 (YOLOv8)',
  '균열 폭 측정 (OpenCV)',
  '등급 판정',
];

function StepIcon({ state }) {
  if (state === 'done') {
    return (
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (state === 'active') {
    return <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #1D9E75', borderTopColor: 'transparent', flexShrink: 0 }} className="spinner" />;
  }
  return <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-secondary)', flexShrink: 0 }} />;
}

export default function AIAnalyzingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useResponsive();
  const file = location.state?.file;
  const projectId = location.state?.projectId;
  const zoneId = location.state?.zoneId;
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (!file) { navigate('/camera'); return; }
    if (calledRef.current) return;
    calledRef.current = true;

    const stepTimers = [];
    STEPS.forEach((_, i) => {
      if (i > 0) stepTimers.push(setTimeout(() => setCurrentStep(i), i * 600));
    });

    detectCracks(file, zoneId)
      .then((result) => {
        stepTimers.forEach(clearTimeout);
        setCurrentStep(STEPS.length);
        setTimeout(() => navigate('/result', { state: { result, projectId, zoneId } }), 400);
      })
      .catch((e) => {
        stepTimers.forEach(clearTimeout);
        setError(e.message || '분석에 실패했습니다.');
      });

    return () => stepTimers.forEach(clearTimeout);
  }, []);

  const previewUrl = file ? URL.createObjectURL(file) : null;

  const innerContent = (
    <>
      {/* Image preview */}
      <div style={{ width: '100%', borderRadius: 16, background: 'var(--bg-secondary)', marginBottom: 28, overflow: 'hidden', flexShrink: 0, maxHeight: isDesktop ? 300 : 200 }}>
        {previewUrl ? (
          <img src={previewUrl} alt="분석 중" style={{ width: '100%', height: '100%', maxHeight: isDesktop ? 300 : 200, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ height: isDesktop ? 300 : 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="4" width="40" height="40" rx="8" stroke="var(--border-secondary)" strokeWidth="2"/>
            </svg>
          </div>
        )}
      </div>

      {error ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-danger)', marginBottom: 12 }}>분석 실패</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</p>
          <button className="btn-secondary" onClick={() => navigate('/camera')} style={{ width: 160 }}>돌아가기</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid #E1F5EE', borderTopColor: '#1D9E75', marginBottom: 14 }} className="spinner" />
            <h2 style={{ fontSize: isDesktop ? 22 : 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>AI 분석 중...</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>YOLOv8 결함 탐지 실행 중</p>
          </div>

          <div style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: 16, padding: '20px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {STEPS.map((label, i) => {
                const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'waiting';
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <StepIcon state={state} />
                    <span
                      style={{ fontSize: 14, color: state === 'done' ? 'var(--text-primary)' : state === 'active' ? '#1D9E75' : 'var(--text-secondary)', fontWeight: state === 'active' ? 600 : 400 }}
                      className={state === 'active' ? 'pulse' : ''}
                    >
                      {label}
                      {state === 'done' && ' — 완료'}
                      {state === 'active' && ' — 진행 중...'}
                      {state === 'waiting' && ' — 대기'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar title="AI 분석 중" />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg-primary)', borderRadius: 20, padding: '32px 36px', border: '1px solid var(--border-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {innerContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 32px' }}>
        {innerContent}
      </div>
    </div>
  );
}
