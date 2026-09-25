import API from './api';

export const getComplaints = (params) => API.get('/complaints', { params });

export const getComplaintDashboard = () => API.get('/complaints/dashboard');

export const getComplaintById = (id) => API.get(`/complaints/${id}`);

export const createComplaint = (data) => API.post('/complaints', data);

export const updateComplaint = (id, data) => API.put(`/complaints/${id}`, data);

export const assignComplaint = (id, data) => API.patch(`/complaints/${id}/assign`, data);

export const updateComplaintStatus = (id, data) => API.patch(`/complaints/${id}/status`, data);

export const escalateComplaint = (id, data) => API.patch(`/complaints/${id}/escalate`, data);

export const resolveComplaint = (id, data) => API.patch(`/complaints/${id}/resolve`, data);

export const closeComplaint = (id, data) => API.patch(`/complaints/${id}/close`, data);

export const reopenComplaint = (id, data) => API.patch(`/complaints/${id}/reopen`, data);

export const addComplaintComment = (id, data) => API.post(`/complaints/${id}/comments`, data);

export const deleteComplaint = (id) => API.delete(`/complaints/${id}`);
