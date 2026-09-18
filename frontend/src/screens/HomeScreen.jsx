import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import BottomTabBar from '../components/BottomTabBar.jsx';
import Badge from '../components/Badge.jsx';
import { getUser } from '../api/client.js';
import { listProjects } from '../api/projects.js';
import { useResponsive } from '../hooks/useResponsive.js';

const STATUS_MAP = {
  planned:     { label: '예정',  variant: 'blue' },
  in_progress: { label: '진행중', variant: 'teal' },
  completed:   { label: '완료',  variant: 'gray' },
};

/* ── Desktop ──────────────────────────────────────────────────── */
function DesktopHome({ user, stats, projects, loading, error, navigate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
      {/* Page header */}
      <div style={{ padding: '28px 32px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>대시보드</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              안녕하세요, {user?.name || '점검사'}님 — 오늘도 안전한 점검을 진행해보세요.
            </p>
          </div>
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

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: '전체 프로젝트', value: stats.total, unit: '건', color: 'var(--text-primary)' },
            { label: '진행 중',       value: stats.active,    unit: '건', color: '#1D9E75' },
            { label: '완료',          value: stats.completed, unit: '건', color: 'var(--text-secondary)' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--border-tertiary)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
              <p style={{ fontSize: 32, fontWeight: 700, color }}>{value}<span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 4 }}>{unit}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Project table */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 32px 32px' }}>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 14, border: '1px solid var(--border-tertiary)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>최근 프로젝트</span>
            <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit' }}>전체보기 →</button>
          </div>

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
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-tertiary)' }}>
                    {['프로젝트명', '상태', '시작일', '구역 수'].map((h) => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '10px 20px', background: 'var(--bg-secondary)', width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => {
                    const st = STATUS_MAP[p.status] || { label: p.status, variant: 'gray' };
                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/projects/${p.id}`)}
                        style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--border-tertiary)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{p.title}</td>
                        <td style={{ padding: '13px 20px' }}><Badge variant={st.variant}>{st.label}</Badge></td>
                        <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.start_date}</td>
                        <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.zones?.length ?? 0}개</td>
                        <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                          <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>상세 →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile ───────────────────────────────────────────────────── */
function MobileHome({ user, stats, projects, loading, error, navigate }) {
  const initials = user?.name ? user.name.slice(0, 2) : 'CB';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border-tertiary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || '점검사'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>진행중 {stats.active}개</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[
            { label: '전체', value: `${stats.total}건` },
            { label: '진행중', value: `${stats.active}건`, color: 'var(--primary)' },
            { label: '완료', value: `${stats.completed}건` },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 14, padding: '14px 12px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>진행 중인 프로젝트</span>
          <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--primary)', cursor: 'pointer' }}>전체보기</button>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: 14 }}>불러오는 중...</div>}
        {!loading && error && <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-danger)', fontSize: 13 }}>{error}</div>}
        {!loading && !error && projects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            진행 중인 프로젝트가 없습니다.
            <br />
            <button onClick={() => navigate('/projects/new')} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ 새 프로젝트 생성</button>
          </div>
        )}
        {projects.map((p) => {
          const st = STATUS_MAP[p.status] || { label: p.status, variant: 'gray' };
          return (
            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-tertiary)', borderRadius: 16, padding: 16, cursor: 'pointer', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.start_date} 시작 · 구역 {p.zones?.length ?? 0}개</div>
            </div>
          );
        })}
      </div>
      <BottomTabBar />
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const user = getUser();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listProjects({ size: 20 })
      .then((data) => {
        const items = data.items || [];
        setProjects(items.slice(0, isDesktop ? 8 : 3));
        setStats({
          total: data.total || 0,
          active: items.filter((p) => p.status === 'in_progress').length,
          completed: items.filter((p) => p.status === 'completed').length,
        });
      })
      .catch(() => setError('프로젝트 목록을 불러올 수 없습니다. 네트워크를 확인해주세요.'))
      .finally(() => setLoading(false));
  }, []);

  return isDesktop
    ? <DesktopHome user={user} stats={stats} projects={projects} loading={loading} error={error} navigate={navigate} />
    : <MobileHome  user={user} stats={stats} projects={projects} loading={loading} error={error} navigate={navigate} />;
}
