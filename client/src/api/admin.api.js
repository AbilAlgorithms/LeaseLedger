import api from './axios';

export const getUsers = async (params) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const suspendUser = async (id) => {
  const response = await api.patch(`/admin/users/${id}/suspend`);
  return response.data;
};

export const reinstateUser = async (id) => {
  const response = await api.patch(`/admin/users/${id}/reinstate`);
  return response.data;
};

export const getConfig = async (key) => {
  const response = await api.get(`/admin/config/${key}`);
  return response.data;
};

export const updateConfig = async (key, data) => {
  const response = await api.put(`/admin/config/${key}`, data);
  return response.data;
};

export const getAuditLogs = async (params) => {
  const response = await api.get('/admin/audit-logs', { params });
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const adminApi = {
  getUsers,
  suspendUser,
  reinstateUser,
  getConfig,
  updateConfig,
  getAuditLogs,
  getStats,
};

export default adminApi;
