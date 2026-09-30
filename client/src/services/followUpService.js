import API from './api';

export const getFollowUps = (params = {}) => API.get('/follow-ups', { params });

export const getFollowUpSummary = () => API.get('/follow-ups/summary');

export const getFollowUpById = (id) => API.get(`/follow-ups/${id}`);

export const createFollowUp = (data) => API.post('/follow-ups', data);

export const updateFollowUp = (id, data) => API.put(`/follow-ups/${id}`, data);

export const completeFollowUp = (id) => API.patch(`/follow-ups/${id}/complete`);

export const rescheduleFollowUp = (id, data) => API.patch(`/follow-ups/${id}/reschedule`, data);

export const cancelFollowUp = (id) => API.patch(`/follow-ups/${id}/cancel`);

export const deleteFollowUp = (id) => API.delete(`/follow-ups/${id}`);
