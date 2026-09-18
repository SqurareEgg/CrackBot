import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import { getReportStatus, getReportDownloadUrl } from '../api/reports.js';
import { getToken } from '../api/client.js';
import { useResponsive } from '../hooks/useResponsive.js';

const FORMAT_LABEL = { pdf: 'PDF', docx: 'DOCX', both: 'PDF + DOCX' };
const STATUS_LABEL = {
  pending:    { label: '대기 중',   variant: 'gray' },
  processing: { label: '생성 중',   variant: 'amber' },
  completed:  { label: '완료',      variant: 'teal' },
  failed:     { label: '실패',      variant: 'red' },
};

function DownloadSection({ reportId, format, status }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const download = async (fileType) => {
    setLoading(true);
    setError('');
    try {
      const data = await getReportDownloadUrl(reportId, fileType);
      const url = data.download_url.startsWith('http')
        ? data.download_url
        : window.location.origin + data.download_url;
      window.open(url, '_blank');
    } catch (e) {
      setError(e.message || '다운로드 URL을 가져올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (status !== 'completed') {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
        보고서 생성이 완료되면 다운로드할 수 있습니다.
      </p>
    );
  }

  const types = format === 'both' ? ['pdf', 'docx'] : [format];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && <p style={{ fontSize: 13, color: 'var(--text-danger)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 12 }}>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => download(t)}
            disabled={loading}
            className="btn-primary"
            style={{ flex: 1, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 10v2h10v-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {t.toUpperCase()} 다운로드
          </button>
        ))}
      </div>
    </div>
  );
}

function PdfPreview({ reportId }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url = null;
    const token = getToken();
    fetch(`/v1/reports/${reportId}/download-file?file_type=pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => { url = URL.createObjectURL(blob); setBlobUrl(url); })
      .catch(() => setFailed(true));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [reportId]);

  if (failed) return <DocumentMock />;
  if (!blobUrl) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, minHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #e0ddd6', borderTopColor: '#1D9E75', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }
  return (
    <iframe
      src={blobUrl}
      title="보고서 미리보기"
      style={{ width: '100%', height: 680, border: 'none', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', display: 'block' }}
    />
  );
}

/* Document mock — shown for DOCX or when PDF unavailable */
function DocumentMock() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', minHeight: 460 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a18', marginBottom: 4 }}>건축물 안전점검 보고서</div>
        <div style={{ fontSize: 12, color: '#5f5e5a' }}>국토안전관리원 표준 양식</div>
      </div>
      <div style={{ height: 1, background: '#e0ddd6', marginBottom: 20 }} />
      {[80, 100, 90, 95].map((w, i) => (
        <div key={i} style={{ height: 10, width: `${w}%`, background: '#e0ddd6', borderRadius: 4, marginBottom: 8 }} />
      ))}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, marginTop: 20 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[100, 90, 95, 85].map((w, i) => (
            <div key={i} style={{ height: 8, width: `${w}%`, background: '#e0ddd6', borderRadius: 4 }} />
          ))}
        </div>
        <div style={{ width: 120, background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 10, padding: '12px 16px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#A32D2D', fontWeight: 600, marginBottom: 4 }}>종합등급</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#A32D2D' }}>D</div>
          <div style={{ fontSize: 10, color: '#A32D2D', marginTop: 2 }}>긴급보수</div>
        </div>
      </div>
      <div style={{ width: '100%', height: 120, background: '#e8e6df', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="3" y="3" width="30" height="30" rx="5" stroke="#c8c4bc" strokeWidth="2"/>
          <circle cx="13" cy="13" r="4" stroke="#c8c4bc" strokeWidth="2"/>
          <path d="M3 24l9-8 6 6 6-5 9 8" stroke="#c8c4bc" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </div>
      {[100, 95, 70].map((w, i) => (
        <div key={i} style={{ height: 8, width: `${w}%`, background: '#e0ddd6', borderRadius: 4, marginBottom: 7 }} />
      ))}
    </div>
  );
}

export default function ReportPreviewScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getReportStatus(id)
      .then(setReport)
      .catch((e) => setError(e.message || '보고서 정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const statusInfo = STATUS_LABEL[report?.status] || STATUS_LABEL.pending;

  const rightButtons = (
    <div style={{ display: 'flex', gap: 6 }}>
      {report?.status === 'completed' && (
        <button
          onClick={async () => {
            try {
              const type = report.format === 'docx' ? 'docx' : 'pdf';
              const data = await getReportDownloadUrl(id, type);
              const url = data.download_url.startsWith('http')
                ? data.download_url
                : window.location.origin + data.download_url;
              window.open(url, '_blank');
            } catch {}
          }}
          style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          title="다운로드"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 10v2h10v-2" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDesktop ? 'var(--bg-secondary)' : 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: 14 }}>
        불러오는 중...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDesktop ? 'var(--bg-secondary)' : 'var(--bg-primary)', color: 'var(--text-danger)', fontSize: 14 }}>
        {error || '보고서를 찾을 수 없습니다.'}
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar title="보고서 미리보기" onBack={() => navigate('/reports')} rightContent={rightButtons} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', gap: 28, justifyContent: 'center', alignItems: 'flex-start' }}>
          {/* Left: Document */}
          <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 640 }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                형식: {FORMAT_LABEL[report.format] || report.format}
                {report.generated_at && ` · ${new Date(report.generated_at).toLocaleString('ko-KR')}`}
              </span>
            </div>
            {report.status === 'completed' ? (
              report.format === 'docx' ? <DocumentMock /> : <PdfPreview reportId={id} />
            ) : (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: '48px 32px', border: '1px solid var(--border-tertiary)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                {report.status === 'failed' ? '보고서 생성에 실패했습니다.' : '보고서를 생성하고 있습니다...'}
              </div>
            )}
          </div>

          {/* Right: Info + Download */}
          <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 14, padding: '20px', border: '1px solid var(--border-tertiary)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>보고서 정보</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: '상태', value: <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge> },
                  { label: '형식', value: FORMAT_LABEL[report.format] || report.format },
                  { label: '생성일', value: report.generated_at ? new Date(report.generated_at).toLocaleDateString('ko-KR') : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <DownloadSection reportId={id} format={report.format} status={report.status} />
          </div>
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar title="보고서 미리보기" onBack={() => navigate('/reports')} rightContent={rightButtons} />
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-tertiary)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{FORMAT_LABEL[report.format] || report.format}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--bg-secondary)' }}>
        {report.status === 'completed' ? (
          report.format === 'docx' ? <DocumentMock /> : <PdfPreview reportId={id} />
        ) : (
          <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            {report.status === 'failed' ? '보고서 생성에 실패했습니다.' : '보고서를 생성하고 있습니다...'}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border-tertiary)', flexShrink: 0, background: 'var(--bg-primary)' }}>
        <DownloadSection reportId={id} format={report.format} status={report.status} />
      </div>
    </div>
  );
}
