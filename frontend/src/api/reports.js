import { api } from './client.js';

export async function listReports(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await api.get(`/v1/reports${qs ? '?' + qs : ''}`);
  return res.data.items;
}

export async function createReport({ projectId, templateType, format }) {
  const res = await api.post('/v1/reports', {
    project_id: projectId,
    template_type: templateType,
    format,
  });
  return res.data;
}

export async function getReportStatus(reportId) {
  const res = await api.get(`/v1/reports/${reportId}/status`);
  return res.data;
}

export async function getReportDownloadUrl(reportId, fileType = 'pdf') {
  const res = await api.get(`/v1/reports/${reportId}/download?file_type=${fileType}`);
  return res.data;
}
