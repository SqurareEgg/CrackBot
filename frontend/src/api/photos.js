import { api, getToken } from './client.js';

export async function getZonePhotos(zoneId) {
  const res = await api.get(`/v1/zones/${zoneId}/photos`);
  return res.data;
}

export async function fetchImageBlob(url) {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('이미지를 불러올 수 없습니다.');
  return URL.createObjectURL(await res.blob());
}
