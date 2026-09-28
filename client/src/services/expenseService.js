import API from './api';

export const getExpenses = (params = {}) => API.get('/expenses', { params });
export const getExpenseStats = (params = {}) => API.get('/expenses/stats', { params });
export const getExpenseById = (id) => API.get(`/expenses/${id}`);
export const createExpense = (data) => API.post('/expenses', data);
export const updateExpense = (id, data) => API.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => API.delete(`/expenses/${id}`);
