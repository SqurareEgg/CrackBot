import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import { useResponsive } from '../hooks/useResponsive.js';
import { getProjectZones } from '../api/projects.js';

export default function CameraScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useResponsive();
  const projectId = location.state?.projectId;
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  // Zone selection
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setZonesLoading(true);
    getProjectZones(projectId)
      .then((z) => {
        setZones(z);
        if (z.length > 0) setSelectedZoneId(z[0].id);
      })
      .catch(() => setZonesError('구역 목록을 불러올 수 없습니다.'))
      .finally(() => setZonesLoading(false));
  }, [projectId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;
    navigate('/analyzing', { state: { file: selectedFile, projectId, zoneId: selectedZoneId || null } });
  };

  const zoneSelector = projectId && zones.length > 0 && (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        점검 구역 선택
      </label>
      <select
        value={selectedZoneId}
        onChange={(e) => setSelectedZoneId(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-secondary)',
          background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
          cursor: 'pointer', outline: 'none',
        }}
      >
        {zones.map((z) => (
          <option key={z.id} value={z.id}>{z.zone_name}</option>
        ))}
      </select>
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar title="균열 분석" onBack={() => navigate(projectId ? `/projects/${projectId}` : '/home')} />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Zone selector */}
            {projectId && (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: '20px 24px', border: '1px solid var(--border-tertiary)' }}>
                {zonesLoading ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>구역 불러오는 중...</p>
                ) : zonesError ? (
                  <p style={{ fontSize: 13, color: 'var(--text-danger)' }}>{zonesError}</p>
                ) : zones.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>이 프로젝트에 구역이 없습니다. 프로젝트 생성 시 구역을 추가해주세요.</p>
                ) : (
                  zoneSelector
                )}
              </div>
            )}

            {/* Upload area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !preview && fileInputRef.current?.click()}
              style={{
                background: dragging ? 'var(--primary-light)' : 'var(--bg-primary)',
                border: `2px dashed ${dragging ? '#1D9E75' : preview ? 'transparent' : 'var(--border-secondary)'}`,
                borderRadius: 20,
                overflow: 'hidden',
                cursor: preview ? 'default' : 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                minHeight: 360,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="선택된 사진"
                  style={{ width: '100%', maxHeight: 480, objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 32px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="17 8 12 3 7 8" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="3" x2="12" y2="15" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>이미지를 드래그하거나 클릭하여 선택</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>JPEG, PNG, WebP, BMP 지원 · 최대 20MB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="btn-outline"
                    style={{ marginTop: 4 }}
                  >
                    파일 선택
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {preview && (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: '20px 24px', border: '1px solid var(--border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedFile?.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedFile ? (selectedFile.size / 1024).toFixed(0) + ' KB' : ''}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button onClick={() => { setPreview(null); setSelectedFile(null); }} className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }}>
                    다시 선택
                  </button>
                  <button
                    onClick={handleAnalyze}
                    className="btn-primary"
                    style={{ width: 'auto', padding: '10px 24px' }}
                    disabled={projectId && zones.length > 0 && !selectedZoneId}
                  >
                    AI 분석 시작 →
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    );
  }

  // Mobile
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111110', position: 'relative', overflow: 'hidden' }}>
      <StatusBar dark />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ flex: 1, position: 'relative' }}>
        {preview ? (
          <img src={preview} alt="선택된 사진" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a18 0%, #0d0d0c 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '20%', left: '8%', right: '8%', bottom: '22%' }}>
                {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
                  <div key={`${v}${h}`} style={{ position: 'absolute', [v]: 0, [h]: 0, width: 22, height: 22 }}>
                    <div style={{ position: 'absolute', [v]: 0, [h]: 0, width: 22, height: 3, background: '#1D9E75', borderRadius: 2 }} />
                    <div style={{ position: 'absolute', [v]: 0, [h]: 0, width: 3, height: 22, background: '#1D9E75', borderRadius: 2 }} />
                  </div>
                ))}
                <div style={{ position: 'absolute', bottom: -28, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  외벽 전면을 프레임 안에 맞춰주세요
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile zone selector overlay */}
      {projectId && zones.length > 0 && (
        <div style={{ background: '#1a1a18', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px', flexShrink: 0 }}>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6 }}>점검 구역</label>
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 14, fontFamily: 'inherit',
            }}
          >
            {zones.map((z) => <option key={z.id} value={z.id} style={{ background: '#1a1a18' }}>{z.zone_name}</option>)}
          </select>
        </div>
      )}

      <div style={{ background: '#111110', padding: '16px 24px 20px', flexShrink: 0 }}>
        {selectedFile ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ flex: 1, color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none' }}>
              다시 선택
            </button>
            <button onClick={handleAnalyze} className="btn-primary" style={{ flex: 1 }}>
              AI 분석 시작
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="16" height="16" rx="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
                <circle cx="7" cy="7" r="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
                <path d="M2 13l5-4 4 4 3-3 4 4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{ width: 68, height: 68, borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', border: '2px solid rgba(0,0,0,0.1)' }} />
            </button>
            <div style={{ width: 44, height: 44 }} />
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
          {selectedFile ? selectedFile.name : '사진을 촬영하거나 갤러리에서 선택하세요'}
        </p>
      </div>
    </div>
  );
}
