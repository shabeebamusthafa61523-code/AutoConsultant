import API from './api';

export const getEnquiries = (params = {}) => API.get('/enquiries', { params });
export const getEnquiryById = (id) => API.get(`/enquiries/${id}`);
export const createEnquiry = (data) => API.post('/enquiries', data);
export const updateEnquiry = (id, data) => API.put(`/enquiries/${id}`, data);
export const convertEnquiryToStudent = (id, data = {}) => API.post(`/enquiries/${id}/convert`, data);
export const deleteEnquiry = (id) => API.delete(`/enquiries/${id}`);
