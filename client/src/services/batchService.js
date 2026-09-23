import API from './api';

export const getBatches = (params = {}) => API.get('/batches', { params });
export const getBatchStats = () => API.get('/batches/stats');
export const getBatchById = (id) => API.get(`/batches/${id}`);
export const createBatch = (data) => API.post('/batches', data);
export const updateBatch = (id, data) => API.put(`/batches/${id}`, data);
export const deleteBatch = (id) => API.delete(`/batches/${id}`);

// Student Assignment & Transfer
export const assignStudentToBatch = (batchId, studentId) => API.post(`/batches/${batchId}/students`, { studentId });
export const removeStudentFromBatch = (batchId, studentId) => API.delete(`/batches/${batchId}/students/${studentId}`);
export const transferStudentFromBatch = (batchId, data) => API.post(`/batches/${batchId}/transfer-student`, data);

// Schedules
export const getBatchSchedules = (batchId) => API.get(`/batches/${batchId}/schedules`);
export const createBatchSchedule = (batchId, data) => API.post(`/batches/${batchId}/schedules`, data);
export const updateBatchSchedule = (batchId, scheduleId, data) => API.put(`/batches/${batchId}/schedules/${scheduleId}`, data);
export const deleteBatchSchedule = (batchId, scheduleId) => API.delete(`/batches/${batchId}/schedules/${scheduleId}`);

// Attendance
export const getBatchAttendance = (batchId, params = {}) => API.get(`/batches/${batchId}/attendance`, { params });
export const recordBatchAttendance = (batchId, data) => API.post(`/batches/${batchId}/attendance`, data);
