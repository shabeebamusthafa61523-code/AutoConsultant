import API from './api';

export const getPayments = (params = {}) => API.get('/payments', { params });
export const getPaymentById = (id) => API.get(`/payments/${id}`);
export const createPayment = (data) => API.post('/payments', data);
export const updatePayment = (id, data) => API.put(`/payments/${id}`, data);
export const deletePayment = (id) => API.delete(`/payments/${id}`);
