import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import BottomTabBar from '../components/BottomTabBar.jsx';
import Badge from '../components/Badge.jsx';
import { listReports, getReportDownloadUrl } from '../api/reports.js';
import { useResponsive } from '../hooks/useResponsive.js';

const STATUS_LABEL = {
  pending:    { label: '대기 중',   variant: 'gray' },
  processing: { label: '생성 중',   variant: 'amber' },
  completed:  { label: '완료',      variant: 'teal' },
  failed:     { label: '실패',      variant: 'red' },
};

const FORMAT_LABEL = { pdf: 'PDF', docx: 'DOCX', both: 'PDF + DOCX' };

function gradeBadgeVariant(grade) {
  if (!grade) return 'amber';
  if (grade === 'D' || grade === 'E') return 'red';
  if (grade === 'C') return 'amber';
  return 'teal';
}

async function downloadReport(reportId, format) {
  const type = format === 'docx' ? 'docx' : 'pdf';
  const data = await getReportDownloadUrl(reportId, type);
  window.open(data.download_url, '_blank');
}

/* ── Desktop ──────────────────────────────────────────────────── */
function DesktopReports({ reports, loading, error, navigate }) {
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 14 }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
      <div style={{ padding: '28px 32px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>보고서</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              {error ? '불러오기 실패' : `총 ${reports.length}건`}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 32px 32px' }}>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 14, border: '1px solid var(--border-tertiary)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          {error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-danger)', fontSize: 14 }}>{error}</div>
          ) : reports.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>아직 생성된 보고서가 없습니다.</div>
          ) : (
            <>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      {['프로젝트', '생성일', '형식', '상태', ''].map((h, i) => (
                        <th key={i} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-tertiary)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => {
                      const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
                      const isCompleted = r.status === 'completed';
                      return (
                        <tr
                          key={r.id}
                          style={{ borderBottom: i < reports.length - 1 ? '1px solid var(--border-tertiary)' : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{r.project_title || '—'}</td>
                          <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                            {r.generated_at ? new Date(r.generated_at).toLocaleDateString('ko-KR') : '—'}
                          </td>
                          <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{FORMAT_LABEL[r.format] || r.format}</td>
                          <td style={{ padding: '13px 20px' }}>
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </td>
                          <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                            {isCompleted && (
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => navigate(`/reports/${r.id}/preview`)}
                                  style={{ padding: '5px 12px', borderRadius: 6, background: 'var(--primary-light)', border: 'none', fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  미리보기
                                </button>
                                <button
                                  onClick={() => downloadReport(r.id, r.format)}
                                  style={{ padding: '5px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--border-secondary)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  다운로드
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-tertiary)', flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                총 {reports.length}건
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile ───────────────────────────────────────────────────── */
function MobileReports({ reports, loading, error, navigate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar title="보고서" rightContent={<span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>총 {reports.length}건</span>} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>불러오는 중...</p>}
        {error && <p style={{ textAlign: 'center', color: 'var(--text-danger)', fontSize: 14 }}>{error}</p>}
        {!loading && !error && reports.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>아직 생성된 보고서가 없습니다.</p>
        )}
        {reports.map((r) => {
          const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
          const isCompleted = r.status === 'completed';
          return (
            <div key={r.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{r.project_title || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {r.generated_at ? `${new Date(r.generated_at).toLocaleDateString('ko-KR')} 생성 · ` : ''}{FORMAT_LABEL[r.format] || r.format}
                  </div>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              {isCompleted && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/reports/${r.id}/preview`)}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-tertiary)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    미리보기
                  </button>
                  <button
                    onClick={() => downloadReport(r.id, r.format)}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-tertiary)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    다운로드
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BottomTabBar />
    </div>
  );
}

export default function ReportListScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch((e) => setError(e.message || '보고서 목록을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, []);

  return isDesktop
    ? <DesktopReports reports={reports} loading={loading} error={error} navigate={navigate} />
    : <MobileReports  reports={reports} loading={loading} error={error} navigate={navigate} />;
}
