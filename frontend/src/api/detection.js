import { api } from './client.js';

export async function detectCracks(imageFile, zoneId = null) {
  const form = new FormData();
  form.append('file', imageFile);
  if (zoneId) form.append('zone_id', zoneId);
  const res = await api.postForm('/v1/photos/detect', form);
  return res.data;
}
