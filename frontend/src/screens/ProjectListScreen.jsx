import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import BottomTabBar from '../components/BottomTabBar.jsx';
import Badge from '../components/Badge.jsx';
import { listProjects } from '../api/projects.js';
import { useResponsive } from '../hooks/useResponsive.js';

const STATUS_MAP = {
  planned:     { label: '예정',  variant: 'blue' },
  in_progress: { label: '진행중', variant: 'teal' },
  completed:   { label: '완료',  variant: 'gray' },
};

const FILTERS = [
  { key: 'all',         label: '전체' },
  { key: 'in_progress', label: '진행중' },
  { key: 'completed',   label: '완료' },
  { key: 'planned',     label: '예정' },
];

/* ── Desktop ──────────────────────────────────────────────────── */
function DesktopList({ activeFilter, setActiveFilter, search, setSearch, projects, loading, error, navigate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
      {/* Toolbar */}
      <div style={{ padding: '28px 32px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>점검 프로젝트</h1>
          <button
            onClick={() => navigate('/projects/new')}
            className="btn-primary"
            style={{ width: 'auto', padding: '9px 18px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            새 프로젝트
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border-tertiary)', flex: '1 1 220px', maxWidth: 320 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="var(--text-secondary)" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="프로젝트 검색..." style={{ flex: 1, background: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit' }}/>
          </div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontFamily: 'inherit',
                  background: activeFilter === f.key ? '#1D9E75' : 'var(--bg-primary)',
                  color: activeFilter === f.key ? '#fff' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: activeFilter === f.key ? 600 : 400, cursor: 'pointer',
                  border: activeFilter === f.key ? 'none' : '1px solid var(--border-tertiary)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 32px 32px' }}>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 14, border: '1px solid var(--border-tertiary)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>불러오는 중...</div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-danger)', fontSize: 14 }}>{error}</div>
          ) : projects.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>프로젝트가 없습니다.</p>
              <button onClick={() => navigate('/projects/new')} className="btn-primary" style={{ width: 'auto', padding: '9px 20px' }}>+ 새 프로젝트 생성</button>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    {['프로젝트명', '상태', '시작일', '생성일', '구역 수', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-tertiary)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => {
                    const st = STATUS_MAP[p.status] || { label: p.status, variant: 'gray' };
                    return (
                      <tr
                        key={p.id}
                        style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--border-tertiary)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => navigate(`/projects/${p.id}`)}
                      >
                        <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{p.title}</td>
                        <td style={{ padding: '13px 20px' }}><Badge variant={st.variant}>{st.label}</Badge></td>
                        <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.start_date || '—'}</td>
                        <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.created_at?.slice(0, 10) || '—'}</td>
                        <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.zones?.length ?? 0}개</td>
                        <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/camera`, { state: { projectId: p.id } }); }}
                              style={{ padding: '5px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--border-secondary)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              촬영
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}
                              style={{ padding: '5px 12px', borderRadius: 6, background: 'var(--primary-light)', border: 'none', fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              상세
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer row */}
          {!loading && projects.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-tertiary)', flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              총 {projects.length}개 프로젝트
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile ───────────────────────────────────────────────────── */
function MobileList({ activeFilter, setActiveFilter, search, setSearch, projects, loading, error, navigate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar
        title="점검 프로젝트"
        rightContent={
          <button onClick={() => navigate('/projects/new')} style={{ width: 28, height: 28, borderRadius: 8, background: '#1D9E75', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        }
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 12, marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="var(--text-secondary)" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="프로젝트 검색" style={{ flex: 1, background: 'none', border: 'none', fontSize: 14, color: 'var(--text-primary)' }}/>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{ padding: '6px 14px', borderRadius: 99, border: activeFilter === f.key ? '1.5px solid #1D9E75' : '1px solid var(--border-secondary)', background: activeFilter === f.key ? '#E1F5EE' : 'transparent', color: activeFilter === f.key ? '#0F6E56' : 'var(--text-secondary)', fontSize: 13, fontWeight: activeFilter === f.key ? 600 : 400, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
              {f.label}
            </button>
          ))}
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 14 }}>불러오는 중...</div>}
        {error && <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-danger)', fontSize: 14 }}>{error}</div>}
        {!loading && !error && projects.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 14 }}>프로젝트가 없습니다.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map((p) => {
            const st = STATUS_MAP[p.status] || { label: p.status, variant: 'gray' };
            return (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 16, padding: 16, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, paddingRight: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {p.start_date} 시작 · 구역 {p.zones?.length ?? 0}개
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function ProjectListScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = activeFilter !== 'all' ? { status: activeFilter } : {};
    listProjects(params)
      .then((data) => setAll(data.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const projects = all.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  const props = { activeFilter, setActiveFilter, search, setSearch, projects, loading, error, navigate };
  return isDesktop ? <DesktopList {...props} /> : <MobileList {...props} />;
}
