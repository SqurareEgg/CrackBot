import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import { getReportStatus } from '../api/reports.js';
import { useResponsive } from '../hooks/useResponsive.js';

const STATUS_STEPS = [
  { key: 'pending',    label: '생성 요청 접수',      progress: 15 },
  { key: 'processing', label: '보고서 렌더링 중',     progress: 60 },
  { key: 'completed',  label: '생성 완료',            progress: 100 },
];

function CheckIcon({ state }) {
  if (state === 'done') {
    return (
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (state === 'active') {
    return <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #1D9E75', borderTopColor: 'transparent', flexShrink: 0 }} className="spinner" />;
  }
  return <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-secondary)', flexShrink: 0 }} />;
}

export default function ReportGeneratingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useResponsive();
  const reportId = location.state?.reportId;
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [error, setError] = useState('');
  const intervalRef = useRef(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 60; // 2분 (2초 × 60)

  useEffect(() => {
    if (!reportId) {
      const t = setTimeout(() => navigate('/reports'), 3000);
      return () => clearTimeout(t);
    }

    const poll = async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        clearInterval(intervalRef.current);
        setError('보고서 생성 시간이 초과됐습니다. 보고서 목록에서 상태를 확인해주세요.');
        return;
      }

      try {
        const data = await getReportStatus(reportId);
        const status = data.status;
        setCurrentStatus(status);

        if (status === 'completed') {
          clearInterval(intervalRef.current);
          setTimeout(() => navigate(`/reports/${reportId}/preview`, { state: { reportId } }), 600);
        } else if (status === 'failed') {
          clearInterval(intervalRef.current);
          setError('보고서 생성에 실패했습니다. 다시 시도해주세요.');
        }
      } catch {
        // 네트워크 오류는 재시도 — pollCount로 상한 적용
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(intervalRef.current);
  }, [reportId]);

  const stepIndex = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
  const progress = STATUS_STEPS.find((s) => s.key === currentStatus)?.progress ?? 15;

  const content = (
    <>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M22 4H10a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10l-6-6Z" stroke="#1D9E75" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M22 4v6h6" stroke="#1D9E75" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M14 20h8M14 15h6M14 25h5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

      {error ? (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-danger)', marginBottom: 8 }}>생성 실패</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
          <button className="btn-secondary" onClick={() => navigate('/reports')} style={{ width: 'auto', padding: '10px 24px' }}>
            보고서 목록으로
          </button>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: isDesktop ? 22 : 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {currentStatus === 'completed' ? '생성 완료!' : '보고서 생성 중...'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
            {currentStatus === 'completed' ? '잠시 후 미리보기로 이동합니다' : '잠시만 기다려 주세요'}
          </p>

          {/* Step list */}
          <div style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {STATUS_STEPS.map((step, i) => {
                const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'waiting';
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckIcon state={state} />
                    <span
                      style={{ fontSize: 14, fontWeight: state === 'active' ? 600 : 400, color: state === 'done' ? 'var(--text-primary)' : state === 'active' ? '#1D9E75' : 'var(--text-secondary)' }}
                      className={state === 'active' ? 'pulse' : ''}
                    >
                      {step.label}
                      {state === 'done' && ' — 완료'}
                      {state === 'active' && ' — 진행 중...'}
                      {state === 'waiting' && ' — 대기'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>진행률</span><span>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--border-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: 6, width: `${progress}%`, borderRadius: 99, background: '#1D9E75', transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {!reportId && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
              완료 후 보고서 목록에서 확인하실 수 있습니다
            </p>
          )}
        </>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg-primary)', borderRadius: 20, padding: '40px 36px', border: '1px solid var(--border-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 32px' }}>
        {content}
      </div>
    </div>
  );
}
