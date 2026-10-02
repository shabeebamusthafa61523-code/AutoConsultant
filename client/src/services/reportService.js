import api from './api';

export const getDailyReports = async (params = {}) => {
  const response = await api.get('/reports/daily', { params });
  return response?.data !== undefined ? response.data : response;
};

export const getMonthlyReports = async (params = {}) => {
  const response = await api.get('/reports/monthly', { params });
  return response?.data !== undefined ? response.data : response;
};
