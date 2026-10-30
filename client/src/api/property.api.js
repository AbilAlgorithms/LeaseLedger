import api from './axios';

export const propertyApi = {
  getProperties: (params) => api.get('/properties', { params }),
  getProperty: (id) => api.get(`/properties/${id}`),
  createProperty: (data) => api.post('/properties', data),
  updateProperty: (id, data) => api.patch(`/properties/${id}`, data),
  toggleArchiveProperty: (id) => api.post(`/properties/${id}/archive`),
  addRoom: (propertyId, data) => api.post(`/properties/${propertyId}/rooms`, data),
  updateRoom: (roomId, data) => api.patch(`/rooms/${roomId}`, data),
  deleteRoom: (roomId) => api.delete(`/rooms/${roomId}`),
  addItem: (roomId, data) => api.post(`/rooms/${roomId}/items`, data),
  updateItem: (itemId, data) => api.patch(`/items/${itemId}`, data),
  deleteItem: (itemId) => api.delete(`/items/${itemId}`),
};
