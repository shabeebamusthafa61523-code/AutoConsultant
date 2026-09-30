import API from './api';

export const getWorkflowStats = () => API.get('/workflow/stats');

export const getWorkflowStudents = (params = {}) => API.get('/workflow', { params });

export const getStudentWorkflow = (studentId) => API.get(`/workflow/${studentId}`);

export const updateStudentStage = (studentId, data) => API.patch(`/workflow/${studentId}/stage`, data);

export const getWorkflowHistory = (studentId) => API.get(`/workflow/${studentId}/history`);

export const addWorkflowNote = (studentId, data) => API.post(`/workflow/${studentId}/note`, data);
