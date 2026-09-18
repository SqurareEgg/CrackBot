import React, { useEffect, useState } from 'react';
import { fetchImageBlob } from '../api/photos.js';

export default function AuthImage({ src, alt, style, fallback = null }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    let objectUrl = null;
    fetchImageBlob(src)
      .then((url) => { objectUrl = url; setBlobUrl(url); })
      .catch(() => setError(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);

  if (!src || error) return fallback;
  if (!blobUrl) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-secondary)', borderTopColor: '#1D9E75' }} className="spinner" />
      </div>
    );
  }
  return <img src={blobUrl} alt={alt} style={style} />;
}
