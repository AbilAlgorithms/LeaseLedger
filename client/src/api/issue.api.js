import api from './axios';

export const issueApi = {
  getTenancyIssues: (tenancyId) => api.get(`/tenancies/${tenancyId}/issues`),
  createIssue: (tenancyId, formData) =>
    api.post(`/tenancies/${tenancyId}/issues`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateIssueStatus: (issueId, data) => api.patch(`/issues/${issueId}/status`, data),
};
