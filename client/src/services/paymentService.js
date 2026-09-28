import API from './api';

export const getPayments = (params = {}) => API.get('/payments', { params });

export const getPaymentStats = (params = {}) => API.get('/payments/stats', { params });

export const getPaymentById = (id) => API.get(`/payments/${id}`);

export const createPayment = (data) => API.post('/payments', data);

export const updatePayment = (id, data) => API.put(`/payments/${id}`, data);

export const deletePayment = (id) => API.delete(`/payments/${id}`);

export const exportPaymentsCSV = async (params = {}) => {
  const blob = await API.get('/payments/export', {
    params,
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `payments_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
