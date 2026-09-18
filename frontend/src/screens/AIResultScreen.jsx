import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import { useResponsive } from '../hooks/useResponsive.js';

function severityColor(severity) {
  if (severity === 'critical') return '#A32D2D';
  if (severity === 'high') return '#E24B4A';
  if (severity === 'medium') return '#EF9F27';
  return '#1D9E75';
}

function gradeFromDetections(detections) {
  if (!detections || detections.length === 0) return 'A';
  const maxWidth = Math.max(...detections.map((d) => d.crack_width_mm || 0));
  const maxConf = Math.max(...detections.map((d) => d.confidence));
  if (maxWidth >= 5 || maxConf >= 0.9) return 'D';
  if (maxWidth >= 3 || maxConf >= 0.75) return 'C';
  return 'B';
}

function gradeBadgeVariant(grade) {
  if (grade === 'D' || grade === 'E') return 'red';
  if (grade === 'C') return 'amber';
  return 'teal';
}

export default function AIResultScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useResponsive();
  const result = location.state?.result;
  const projectId = location.state?.projectId;
  const isSaved = result?.saved === true;

  if (!result) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDesktop ? 'var(--bg-secondary)' : 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>결과 데이터가 없습니다.</p>
          <button className="btn-secondary" onClick={() => navigate('/camera')} style={{ width: 160 }}>돌아가기</button>
        </div>
      </div>
    );
  }

  const { detections = [], count = 0, annotated_image_base64 } = result;
  const grade = gradeFromDetections(detections);
  const maxCrackMm = detections.length > 0 ? Math.max(...detections.map((d) => d.crack_width_mm || 0)) : 0;
  const maxConf = detections.length > 0 ? Math.max(...detections.map((d) => d.confidence)) : 0;
  const isDanger = grade === 'D' || grade === 'E';
  const backPath = projectId ? `/projects/${projectId}` : '/projects';

  const detectionList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {detections.length === 0 ? (
        <p style={{ fontSize: 14, color: '#1D9E75' }}>결함이 탐지되지 않았습니다 — 양호한 상태입니다.</p>
      ) : (
        detections.map((d, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: severityColor(d.severity), flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>균열(Crack) {i + 1}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round(d.confidence * 100)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--border-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: 6, width: `${Math.round(d.confidence * 100)}%`, borderRadius: 99, background: severityColor(d.severity) }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
              폭 {d.crack_width_mm}mm · 심각도: {d.severity}
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar
          title="탐지 결과"
          onBack={() => navigate(backPath)}
          rightContent={<Badge variant={gradeBadgeVariant(grade)}>{grade}등급</Badge>}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1100, margin: '0 auto', alignItems: 'start' }}>

            {/* Left: annotated image */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--bg-primary)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-tertiary)' }}>
                {annotated_image_base64 ? (
                  <img src={`data:image/jpeg;base64,${annotated_image_base64}`} alt="탐지 결과 이미지" style={{ width: '100%', display: 'block' }} />
                ) : (
                  <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>이미지 없음</div>
                )}
              </div>

              {isSaved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#E1F5EE', borderRadius: 10, marginBottom: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>분석 결과가 프로젝트에 저장되었습니다</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => navigate('/camera', { state: { projectId } })} className="btn-secondary" style={{ flex: 1 }}>
                  재촬영
                </button>
                <button onClick={() => navigate(backPath)} className="btn-primary" style={{ flex: 1 }}>
                  {isSaved ? '프로젝트로 이동' : '돌아가기'}
                </button>
              </div>
            </div>

            {/* Right: results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>탐지된 결함</h3>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{count}개</span>
                </div>
                {detectionList}
              </div>

              {/* Crack width */}
              {count > 0 && (
                <div style={{ background: isDanger ? 'var(--bg-danger)' : 'var(--bg-primary)', border: `1px solid ${isDanger ? 'var(--border-danger)' : 'var(--border-tertiary)'}`, borderRadius: 16, padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>최대 균열 폭</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 40, fontWeight: 700, color: isDanger ? 'var(--text-danger)' : 'var(--text-primary)' }}>{maxCrackMm.toFixed(1)}</span>
                    <div>
                      <span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>mm</span>
                      <div style={{ marginTop: 4 }}><Badge variant={gradeBadgeVariant(grade)}>{grade}등급</Badge></div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: isDanger ? 'var(--text-danger)' : 'var(--text-secondary)', lineHeight: 1.6 }}>
                    신뢰도 {Math.round(maxConf * 100)}% · {grade === 'D' ? '기준치(0.3mm) 초과 — 긴급 보수 권고' : grade === 'C' ? '정밀 안전진단 실시 권고' : '주기적 모니터링 권고'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar title="탐지 결과" onBack={() => navigate(backPath)} rightContent={<Badge variant={gradeBadgeVariant(grade)}>{grade}등급</Badge>} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
        <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 20, background: 'var(--bg-secondary)' }}>
          {annotated_image_base64 ? (
            <img src={`data:image/jpeg;base64,${annotated_image_base64}`} alt="탐지 결과 이미지" style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>이미지 없음</div>
          )}
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: detections.length > 0 ? 14 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>탐지된 결함</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{count}개</span>
          </div>
          {detectionList}
        </div>

        {count > 0 && (
          <div style={{ background: isDanger ? 'var(--bg-danger)' : 'var(--bg-secondary)', border: `1px solid ${isDanger ? 'var(--border-danger)' : 'var(--border-tertiary)'}`, borderRadius: 16, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>최대 균열 폭</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: isDanger ? 'var(--text-danger)' : 'var(--text-primary)' }}>{maxCrackMm.toFixed(1)}</span>
              <div>
                <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}> mm</span>
                <div style={{ marginTop: 4 }}><Badge variant={gradeBadgeVariant(grade)}>{grade}등급</Badge></div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: isDanger ? 'var(--text-danger)' : 'var(--text-secondary)', lineHeight: 1.5 }}>
              신뢰도 {Math.round(maxConf * 100)}% · {grade === 'D' ? '기준치(0.3mm) 초과 — 긴급 보수 권고' : grade === 'C' ? '정밀 안전진단 실시 권고' : '주기적 모니터링 권고'}
            </p>
          </div>
        )}

        {isSaved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#E1F5EE', borderRadius: 10, marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7l3 3 6-6" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>분석 결과가 프로젝트에 저장되었습니다</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/camera', { state: { projectId } })} className="btn-secondary" style={{ flex: 1 }}>재촬영</button>
          <button onClick={() => navigate(backPath)} className="btn-primary" style={{ flex: 1 }}>{isSaved ? '프로젝트로 이동' : '돌아가기'}</button>
        </div>
      </div>
    </div>
  );
}
