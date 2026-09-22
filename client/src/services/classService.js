import API from './api';

export const getClasses = (params = {}) => API.get('/classes', { params });
export const getClassById = (id) => API.get(`/classes/${id}`);
export const createClass = (data) => API.post('/classes', data);
export const updateClass = (id, data) => API.put(`/classes/${id}`, data);
export const deleteClass = (id) => API.delete(`/classes/${id}`);
