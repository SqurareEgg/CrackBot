import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import AuthImage from '../components/AuthImage.jsx';
import { getProject, getProjectGrades, updateProjectStatus } from '../api/projects.js';
import { getZonePhotos } from '../api/photos.js';
import { useResponsive } from '../hooks/useResponsive.js';

const STATUS_MAP = {
  planned:     { label: '예정',  variant: 'blue' },
  in_progress: { label: '진행중', variant: 'teal' },
  completed:   { label: '완료',  variant: 'gray' },
};

const STATUS_OPTIONS = [
  { value: 'planned',     label: '예정' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed',   label: '완료' },
];

const SEVERITY_COLOR = { critical: '#A32D2D', high: '#E24B4A', medium: '#EF9F27', low: '#1D9E75' };

function StatusSelect({ current, onChange }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    const next = e.target.value;
    if (next === current) return;
    setBusy(true);
    try { await onChange(next); } finally { setBusy(false); }
  };
  return (
    <select
      value={current}
      onChange={handle}
      disabled={busy}
      style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-secondary)', background: 'var(--bg-primary)', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
    >
      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function gradeBadgeVariant(g) {
  if (!g) return 'gray';
  if (g === 'D' || g === 'E') return 'red';
  if (g === 'C') return 'amber';
  return 'teal';
}

/* ── Photo Detail Modal ─────────────────────────────────────────── */
function PhotoModal({ photo, onClose }) {
  const [showOverlay, setShowOverlay] = useState(true);

  if (!photo) return null;
  const imgUrl = showOverlay ? photo.overlay_url : photo.image_url;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-primary)', borderRadius: 20, overflow: 'hidden', maxWidth: 780, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>사진 상세</span>
            {photo.detection_count > 0 && <Badge variant="red">결함 {photo.detection_count}개</Badge>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {photo.overlay_url && photo.image_url && (
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-secondary)' }}>
                {[['overlay', '탐지결과'], ['raw', '원본']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setShowOverlay(key === 'overlay')}
                    style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', border: 'none', cursor: 'pointer', background: (showOverlay ? key === 'overlay' : key === 'raw') ? '#1D9E75' : 'transparent', color: (showOverlay ? key === 'overlay' : key === 'raw') ? '#fff' : 'var(--text-secondary)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Image */}
          <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, maxHeight: 420, flexShrink: 0 }}>
            <AuthImage
              src={imgUrl}
              alt="사진"
              style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }}
              fallback={
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>이미지 없음</div>
              }
            />
          </div>

          {/* Detections */}
          <div style={{ padding: '16px 20px' }}>
            {photo.detections?.length === 0 ? (
              <p style={{ fontSize: 14, color: '#1D9E75', fontWeight: 500 }}>결함이 탐지되지 않았습니다 — 양호한 상태입니다.</p>
            ) : (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>탐지된 결함</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {photo.detections?.map((d, i) => (
                    <div key={d.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLOR[d.severity] || '#aaa', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>균열 {i + 1}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>폭 {d.crack_width_mm}mm</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: SEVERITY_COLOR[d.severity] }}>{Math.round(d.confidence * 100)}%</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.severity}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {photo.max_crack_mm != null && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-danger)', borderRadius: 10, border: '1px solid var(--border-danger)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-danger)', fontWeight: 600 }}>최대 균열 폭: {photo.max_crack_mm}mm</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Zone Photos Panel ──────────────────────────────────────────── */
function ZonePhotosPanel({ zone }) {
  const [photos, setPhotos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    getZonePhotos(zone.id)
      .then((data) => setPhotos(data.photos || []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [zone.id]);

  if (loading) return <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>사진 불러오는 중...</div>;
  if (!photos?.length) return <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>이 구역에 저장된 사진이 없습니다.</div>;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, padding: '12px 16px 16px' }}>
        {photos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: 'var(--bg-secondary)', border: '1px solid var(--border-tertiary)' }}
          >
            <AuthImage
              src={photo.overlay_url || photo.image_url}
              alt="사진"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              fallback={
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--border-secondary)" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="2.5" stroke="var(--border-secondary)" strokeWidth="1.5"/><path d="M3 16l5-4 4 4 3-3 6 5" stroke="var(--border-secondary)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                </div>
              }
            />
            {photo.detection_count > 0 && (
              <div style={{ position: 'absolute', top: 5, right: 5, background: '#E24B4A', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px' }}>
                {photo.detection_count}
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedPhoto && <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}
    </>
  );
}

/* ── Desktop ──────────────────────────────────────────────────── */
function DesktopDetail({ project, grades, navigate, id, onStatusChange }) {
  const overallGrade = grades?.overall_grade;
  const totalDefects = grades?.total_defects ?? 0;
  const maxCrack = grades?.max_crack_mm;
  const isDanger = overallGrade === 'D' || overallGrade === 'E';
  const [expandedZone, setExpandedZone] = useState(null);

  const toggleZone = (zoneId) => setExpandedZone((prev) => (prev === zoneId ? null : zoneId));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
      <div style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-tertiary)', padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
          <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, fontFamily: 'inherit', padding: 0 }}>점검 프로젝트</button>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{project.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{project.title}</h1>
            {overallGrade && <Badge variant={gradeBadgeVariant(overallGrade)}>{overallGrade}등급</Badge>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <StatusSelect current={project.status} onChange={onStatusChange} />
            <button onClick={() => navigate('/camera', { state: { projectId: id } })} className="btn-secondary" style={{ width: 'auto', padding: '8px 18px', fontSize: 13 }}>
              촬영 / 분석
            </button>
            <button onClick={() => navigate(`/reports/settings/${id}`)} className="btn-primary" style={{ width: 'auto', padding: '8px 18px', fontSize: 13 }}>
              보고서 생성
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {project.start_date} ~ {project.end_date || '미정'}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '점검 구역', value: `${project.zones?.length ?? 0}개` },
            { label: '탐지 결함', value: `${totalDefects}개`, danger: totalDefects > 0 },
            { label: '종합 등급', value: overallGrade ? `${overallGrade}등급` : '미정', danger: isDanger },
          ].map(({ label, value, danger }) => (
            <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 14, padding: '18px 22px', border: `1px solid ${danger ? 'var(--border-danger)' : 'var(--border-tertiary)'}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: danger ? 'var(--text-danger)' : 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recommendation */}
          <div>
            {grades?.recommendation ? (
              <div style={{ background: isDanger ? 'var(--bg-danger)' : 'var(--bg-primary)', border: `1px solid ${isDanger ? 'var(--border-danger)' : 'var(--border-tertiary)'}`, borderRadius: 14, padding: '18px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>안전 권고</p>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6 }}>{grades.recommendation}</p>
                {maxCrack && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>최대 균열 폭: <strong>{maxCrack}mm</strong></p>}
              </div>
            ) : (
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 14, padding: '18px 20px' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>아직 점검 데이터가 없습니다. 촬영 후 AI 분석을 실행하세요.</p>
              </div>
            )}
          </div>

          {/* Zone table with expandable photo grid */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-tertiary)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              구역별 현황 <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 6 }}>구역 클릭 시 사진 확인</span>
            </div>
            {!project.zones?.length ? (
              <div style={{ padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>구역이 없습니다.</div>
            ) : (
              project.zones.map((zone, i) => {
                const zg = grades?.zones?.find((z) => z.zone_id === zone.id);
                const grd = zg?.grade || zone.grade;
                const isExpanded = expandedZone === zone.id;
                return (
                  <div key={zone.id} style={{ borderBottom: i < project.zones.length - 1 ? '1px solid var(--border-tertiary)' : 'none' }}>
                    <div
                      onClick={() => toggleZone(zone.id)}
                      style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}>
                          <path d="M5 3l4 4-4 4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{zone.zone_name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 12 }}>사진 {zone.photo_count}장</span>
                      <span style={{ fontSize: 12, color: zg?.defect_count > 0 ? 'var(--text-danger)' : 'var(--text-secondary)', marginRight: 12 }}>결함 {zg?.defect_count ?? 0}개</span>
                      {grd ? <Badge variant={gradeBadgeVariant(grd)}>{grd}등급</Badge> : <Badge variant="gray">미점검</Badge>}
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-tertiary)', background: 'var(--bg-secondary)' }}>
                        <ZonePhotosPanel zone={zone} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile ───────────────────────────────────────────────────── */
function MobileDetail({ project, grades, navigate, id, onStatusChange }) {
  const overallGrade = grades?.overall_grade;
  const totalDefects = grades?.total_defects ?? 0;
  const maxCrack = grades?.max_crack_mm;
  const isDanger = overallGrade === 'D' || overallGrade === 'E';
  const [expandedZone, setExpandedZone] = useState(null);

  const toggleZone = (zoneId) => setExpandedZone((prev) => (prev === zoneId ? null : zoneId));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar title={project.title} onBack={() => navigate('/projects')} rightContent={<StatusSelect current={project.status} onChange={onStatusChange} />} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{project.start_date} ~ {project.end_date || '미정'}</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[
            { label: '구역', value: `${project.zones?.length ?? 0}개` },
            { label: '결함', value: `${totalDefects}개`, danger: totalDefects > 0 },
            { label: '등급', value: overallGrade ? `${overallGrade}등급` : '미정', danger: isDanger },
          ].map(({ label, value, danger }) => (
            <div key={label} style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: danger ? 'var(--text-danger)' : 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {grades?.recommendation && (
          <div style={{ background: isDanger ? 'var(--bg-danger)' : 'var(--bg-secondary)', border: `1px solid ${isDanger ? 'var(--border-danger)' : 'var(--border-tertiary)'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>안전 권고</div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{grades.recommendation}</div>
            {maxCrack && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>최대 균열 폭: {maxCrack}mm</div>}
          </div>
        )}

        {project.zones?.length > 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              구역별 현황 <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>— 탭하면 사진 보기</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {project.zones.map((zone) => {
                const zg = grades?.zones?.find((z) => z.zone_id === zone.id);
                const grd = zg?.grade || zone.grade;
                const isExpanded = expandedZone === zone.id;
                return (
                  <div key={zone.id} style={{ borderRadius: 14, border: '1px solid var(--border-tertiary)', overflow: 'hidden' }}>
                    <div
                      onClick={() => toggleZone(zone.id)}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{zone.zone_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          사진 {zone.photo_count}장{zg?.defect_count > 0 ? ` · 결함 ${zg.defect_count}개` : ''}
                        </div>
                      </div>
                      {grd ? <Badge variant={gradeBadgeVariant(grd)}>{grd}등급</Badge> : <Badge variant="gray">미점검</Badge>}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 8, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                        <path d="M5 3l4 4-4 4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-tertiary)', background: 'var(--bg-secondary)' }}>
                        <ZonePhotosPanel zone={zone} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/camera', { state: { projectId: id } })} className="btn-secondary" style={{ flex: 1 }}>촬영 / 분석</button>
          <button onClick={() => navigate(`/reports/settings/${id}`)} className="btn-primary" style={{ flex: 1 }}>보고서 생성</button>
        </div>
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function ProjectDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const [project, setProject] = useState(null);
  const [grades, setGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getProject(id), getProjectGrades(id)])
      .then(([proj, gradeData]) => { setProject(proj); setGrades(gradeData); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    const prev = project.status;
    setProject((p) => ({ ...p, status: newStatus }));
    try {
      await updateProjectStatus(id, newStatus);
    } catch {
      setProject((p) => ({ ...p, status: prev }));
    }
  };

  const bg = isDesktop ? 'var(--bg-secondary)' : 'var(--bg-primary)';
  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: 'var(--text-secondary)', fontSize: 14 }}>불러오는 중...</div>;
  if (error || !project) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: 'var(--text-danger)', fontSize: 14 }}>{error || '프로젝트를 찾을 수 없습니다.'}</div>;

  return isDesktop
    ? <DesktopDetail project={project} grades={grades} navigate={navigate} id={id} onStatusChange={handleStatusChange} />
    : <MobileDetail  project={project} grades={grades} navigate={navigate} id={id} onStatusChange={handleStatusChange} />;
}
