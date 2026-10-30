import api from './axios';

export const getTenancies = (params) => api.get('/tenancies', { params });
export const getTenancyById = (id) => api.get(`/tenancies/${id}`);
export const createTenancy = (data) => api.post('/tenancies', data);
export const updateTenancy = (id, data) => api.patch(`/tenancies/${id}`, data);
export const createInvitation = (tenancyId, data) => api.post(`/tenancies/${tenancyId}/invitations`, data);
export const revokeInvitation = (tenancyId, invId) => api.post(`/tenancies/${tenancyId}/invitations/${invId}/revoke`);
export const validateInvitation = (token) => api.get(`/invitations/${token}`);
export const acceptInvitation = (token) => api.post(`/invitations/${token}/accept`);

export const tenancyApi = {
  getTenancies,
  getTenancy: getTenancyById,
  getTenancyById,
  createTenancy,
  updateTenancy,
  createInvitation,
  revokeInvitation,
  validateInvitation,
  acceptInvitation,
};

export default tenancyApi;
