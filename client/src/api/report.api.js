import api from './axios';

export const generateReport = async (tenancyId) => {
  const response = await api.post(`/tenancies/${tenancyId}/report`);
  return response.data;
};

export const getTenancyReport = async (tenancyId) => {
  const response = await api.get(`/tenancies/${tenancyId}/report`);
  return response.data;
};

export const downloadReportBlob = async (tenancyId) => {
  const response = await api.get(`/tenancies/${tenancyId}/report/download`, {
    responseType: 'blob',
  });
  return response.data;
};

export const shareReport = async (tenancyId) => {
  const response = await api.post(`/tenancies/${tenancyId}/report/share`);
  return response.data;
};

export const revokeReportShare = async (tenancyId) => {
  const response = await api.delete(`/tenancies/${tenancyId}/report/share`);
  return response.data;
};

export const getPublicReport = async (token) => {
  const response = await api.get(`/shared/reports/${token}`);
  return response.data;
};

export const downloadPublicReportBlob = async (token) => {
  const response = await api.get(`/shared/reports/${token}/download`, {
    responseType: 'blob',
  });
  return response.data;
};
