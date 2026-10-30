import api from './axios';

export const runComparison = async (tenancyId) => {
  const response = await api.post(`/tenancies/${tenancyId}/compare`);
  return response.data;
};

export const getTenancyComparison = async (tenancyId) => {
  const response = await api.get(`/tenancies/${tenancyId}/comparison`);
  return response.data;
};
