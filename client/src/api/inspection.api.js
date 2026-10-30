import api from './axios';

export const inspectionApi = {
  createOrGetInspection: (tenancyId, type) =>
    api.post(`/tenancies/${tenancyId}/inspections`, { type }),
  getInspection: (id) => api.get(`/inspections/${id}`),
  updateConditionRecord: (inspectionId, itemId, data) =>
    api.put(`/inspections/${inspectionId}/records/${itemId}`, data),
  uploadRecordPhoto: (inspectionId, itemId, formData) =>
    api.post(`/inspections/${inspectionId}/records/${itemId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteRecordPhoto: (photoId) => api.delete(`/inspections/photos/${photoId}`),
  updateMeterReading: (inspectionId, meterType, data) =>
    api.put(`/inspections/${inspectionId}/meters/${meterType}`, data),
  submitInspection: (inspectionId) => api.post(`/inspections/${inspectionId}/submit`),
  confirmInspection: (inspectionId) => api.post(`/inspections/${inspectionId}/confirm`),
  disputeRecord: (inspectionId, itemId, reason) =>
    api.post(`/inspections/${inspectionId}/records/${itemId}/dispute`, { reason }),
  createAmendment: (inspectionId, data) =>
    api.post(`/inspections/${inspectionId}/amendments`, data),
  acknowledgeAmendment: (amendmentId) =>
    api.post(`/amendments/${amendmentId}/acknowledge`),
};
