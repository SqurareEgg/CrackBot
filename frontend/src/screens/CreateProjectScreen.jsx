import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import { createBuilding, createProject } from '../api/projects.js';
import { useResponsive } from '../hooks/useResponsive.js';

export default function CreateProjectScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const [buildingName, setBuildingName] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [zones, setZones] = useState(['A구역', 'B구역']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addZone = () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    setZones((prev) => [...prev, `${labels[prev.length] || prev.length + 1}구역`]);
  };

  const removeZone = (i) => setZones((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!buildingName.trim()) { setError('건물명을 입력해주세요.'); return; }
    if (!address.trim()) { setError('주소를 입력해주세요.'); return; }
    if (!startDate) { setError('시작일을 입력해주세요.'); return; }
    setError('');
    setLoading(true);
    try {
      const building = await createBuilding(buildingName.trim(), address.trim());
      await createProject({
        buildingId: building.id,
        title: buildingName.trim(),
        startDate,
        endDate: endDate || undefined,
        zones,
      });
      navigate('/projects');
    } catch (e) {
      setError(e.message || '프로젝트 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid var(--border-secondary)',
    borderRadius: 12,
    fontSize: 15,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };

  const formContent = (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>건물명 <span style={{ color: 'var(--text-danger)' }}>*</span></label>
        <input style={{ ...inputStyle, borderColor: '#1D9E75' }} value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="건물명 입력" autoFocus />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>주소 <span style={{ color: 'var(--text-danger)' }}>*</span></label>
        <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="주소 입력" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>시작일 <span style={{ color: 'var(--text-danger)' }}>*</span></label>
          <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>종료 예정일</label>
          <input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>점검 구역</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {zones.map((z, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#E1F5EE' }}>
              <span style={{ color: '#0F6E56', fontSize: 13, fontWeight: 600 }}>{z}</span>
              <button onClick={() => removeZone(i)} style={{ background: 'none', border: 'none', color: '#0F6E56', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}>×</button>
            </div>
          ))}
          <button onClick={addZone} style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px dashed var(--border-secondary)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + 추가
          </button>
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: 'var(--text-danger)', marginBottom: 12 }}>{error}</p>}

      <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
        {loading ? '생성 중...' : '프로젝트 생성'}
      </button>
    </>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar title="새 점검 프로젝트" onBack={() => navigate('/projects')} />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 640, background: 'var(--bg-primary)', borderRadius: 20, padding: '32px 36px', border: '1px solid var(--border-tertiary)', alignSelf: 'flex-start' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>새 점검 프로젝트</h2>
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar title="새 점검 프로젝트" onBack={() => navigate('/projects')} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {formContent}
      </div>
    </div>
  );
}
