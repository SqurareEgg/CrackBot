import { api } from './client.js';

export async function listProjects(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await api.get(`/v1/projects${qs ? '?' + qs : ''}`);
  return res.data;
}

export async function getProject(id) {
  const res = await api.get(`/v1/projects/${id}`);
  return res.data;
}

export async function createBuilding(name, address) {
  const res = await api.post('/v1/buildings', { name, address });
  return res.data;
}

export async function createProject({ buildingId, title, startDate, endDate, zones }) {
  const res = await api.post('/v1/projects', {
    building_id: buildingId,
    title,
    start_date: startDate,
    end_date: endDate || null,
    zones: zones.map((name) => ({ zone_name: name })),
  });
  return res.data;
}

export async function getProjectGrades(projectId) {
  const res = await api.get(`/v1/projects/${projectId}/grades`);
  return res.data;
}

export async function updateProjectStatus(projectId, status) {
  const res = await api.patch(`/v1/projects/${projectId}/status`, { status });
  return res.data;
}

export async function getProjectZones(projectId) {
  const res = await api.get(`/v1/projects/${projectId}`);
  return res.data.zones || [];
}
