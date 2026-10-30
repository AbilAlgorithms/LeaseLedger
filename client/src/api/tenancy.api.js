import api from './axios';

export const tenancyApi = {
  getTenancies: (params) => api.get('/tenancies', { params }),
  getTenancy: (id) => api.get(`/tenancies/${id}`),
  createTenancy: (data) => api.post('/tenancies', data),
  updateTenancy: (id, data) => api.patch(`/tenancies/${id}`, data),
  createInvitation: (tenancyId, data) => api.post(`/tenancies/${tenancyId}/invitations`, data),
  revokeInvitation: (tenancyId, invId) => api.post(`/tenancies/${tenancyId}/invitations/${invId}/revoke`),
  validateInvitation: (token) => api.get(`/invitations/${token}`),
  acceptInvitation: (token) => api.post(`/invitations/${token}/accept`),
};
