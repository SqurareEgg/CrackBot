import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import { useResponsive } from '../hooks/useResponsive.js';

const queueItems = [
  { id: 'IMG_0023', name: 'IMG_0023.jpg', zone: 'A구역 1층', status: '대기' },
  { id: 'IMG_0024', name: 'IMG_0024.jpg', zone: 'A구역 1층', status: '대기' },
];

export default function OfflineQueueScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar title="오프라인 대기 목록" onBack={() => navigate('/home')} />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 600 }}>
            {/* Offline banner */}
            <div style={{ background: '#FAEEDA', border: '1px solid #ECD9A8', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14.5 13H1.5L8 2Z" stroke="#854F0B" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="#854F0B" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#854F0B' }}>오프라인 모드 — 네트워크 연결 시 자동 업로드됩니다</span>
            </div>

            {/* Queue list */}
            <div style={{ background: 'var(--bg-primary)', borderRadius: 16, border: '1px solid var(--border-tertiary)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>업로드 대기 중</span>
                <Badge variant="amber">4장</Badge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {queueItems.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < queueItems.length - 1 ? '1px solid var(--border-tertiary)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <rect x="2" y="2" width="16" height="16" rx="3" stroke="var(--text-secondary)" strokeWidth="1.5"/>
                          <circle cx="7" cy="7" r="2" stroke="var(--text-secondary)" strokeWidth="1.5"/>
                          <path d="M2 13l5-4 4 4 3-3 4 4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{item.zone}</div>
                      </div>
                    </div>
                    <Badge variant="amber">{item.status}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button onClick={() => navigate('/camera')} className="btn-primary">
                새 사진 추가
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile: dark camera UI with overlay queue
  const CORNER_SIZE = 22;
  const CORNER_THICKNESS = 3;
  const CORNER_COLOR = '#1D9E75';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111110', minHeight: 0 }}>
      <StatusBar dark />
      <div style={{ background: '#FAEEDA', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L14.5 13H1.5L8 2Z" stroke="#854F0B" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 7v3M8 11.5v.5" stroke="#854F0B" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#854F0B' }}>오프라인 모드 — 촬영은 가능합니다</span>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a18 0%, #0d0d0c 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '20%', left: '8%', right: '8%', bottom: '22%' }}>
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={`${v}${h}`} style={{ position: 'absolute', [v]: 0, [h]: 0, width: CORNER_SIZE, height: CORNER_SIZE }}>
                <div style={{ position: 'absolute', [v]: 0, [h]: 0, width: CORNER_SIZE, height: CORNER_THICKNESS, background: CORNER_COLOR, borderRadius: 2 }} />
                <div style={{ position: 'absolute', [v]: 0, [h]: 0, width: CORNER_THICKNESS, height: CORNER_SIZE, background: CORNER_COLOR, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.75)', padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>업로드 대기 중 4장</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {queueItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{item.zone}</div>
                </div>
                <Badge variant="amber">{item.status}</Badge>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>네트워크 연결 시 자동으로 업로드됩니다</p>
        </div>
      </div>

      <div style={{ background: '#111110', padding: '16px 24px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => navigate('/analyzing')} style={{ width: 68, height: 68, borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  );
}
