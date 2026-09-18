import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import { getProject } from '../api/projects.js';
import { createReport } from '../api/reports.js';
import { useResponsive } from '../hooks/useResponsive.js';

const FORMAT_OPTIONS = [
  { label: 'PDF',   value: 'pdf' },
  { label: 'DOCX',  value: 'docx' },
  { label: '둘 다', value: 'both' },
];

const TEMPLATES = [
  { id: 'standard', label: '국토안전관리원 표준 양식', desc: '공식 제출용 표준 보고서' },
  { id: 'summary',  label: '간이 요약 보고서',         desc: '내부 검토용 간략 요약' },
];

export default function ReportSettingsScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();

  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProject(id)
      .then(setProject)
      .catch(() => setError('프로젝트 정보를 불러올 수 없습니다.'))
      .finally(() => setLoadingProject(false));
  }, [id]);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const report = await createReport({
        projectId: id,
        templateType: selectedTemplate,
        format: selectedFormat,
      });
      navigate('/reports/generating', { state: { reportId: report.id } });
    } catch (e) {
      setError(e.message || '보고서 생성 요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <>
      {/* Project summary */}
      {loadingProject ? (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
          프로젝트 정보 불러오는 중...
        </div>
      ) : project ? (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{project.title}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', alignItems: 'center' }}>
            <span>구역 {project.zones?.length ?? 0}개</span>
            <span>{project.start_date} 시작</span>
          </div>
        </div>
      ) : null}

      {/* Format */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>출력 형식</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {FORMAT_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedFormat(f.value)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, fontFamily: 'inherit',
                border: selectedFormat === f.value ? '2px solid #1D9E75' : '1.5px solid var(--border-secondary)',
                background: selectedFormat === f.value ? '#E1F5EE' : 'var(--bg-primary)',
                color: selectedFormat === f.value ? '#0F6E56' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: selectedFormat === f.value ? 700 : 400, cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>양식 선택</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 14, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                border: selectedTemplate === t.id ? '1.5px solid #1D9E75' : '1px solid var(--border-tertiary)',
                background: 'var(--bg-primary)',
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: selectedTemplate === t.id ? '5px solid #1D9E75' : '2px solid var(--border-secondary)' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: 'var(--text-danger)', marginBottom: 12 }}>{error}</p>}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={submitting || loadingProject}
        style={{ marginBottom: 12, opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? '요청 중...' : '보고서 생성 요청'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
        생성 완료까지 약 5초 정도 소요됩니다
      </p>
    </>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar title="보고서 생성" onBack={() => navigate(`/projects/${id}`)} />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 600, background: 'var(--bg-primary)', borderRadius: 20, padding: '32px 36px', border: '1px solid var(--border-tertiary)', alignSelf: 'flex-start' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>보고서 생성 설정</h2>
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar title="보고서 생성" onBack={() => navigate(`/projects/${id}`)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {formContent}
      </div>
    </div>
  );
}
