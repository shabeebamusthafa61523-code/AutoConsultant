import API from './api';

export const getStudents = (params = {}) => API.get('/students', { params });
export const getStudentById = (id) => API.get(`/students/${id}`);
export const getStudentDetails = (id) => API.get(`/students/${id}/details`);
export const createStudent = (data) => API.post('/students', data);
export const updateStudent = (id, data) => API.put(`/students/${id}`, data);
export const updateStudentStatus = (id, data) => API.patch(`/students/${id}/status`, data);
export const transferStudentBatch = (id, data) => API.post(`/students/${id}/batch-transfer`, data);
export const addStudentDocument = (id, data) => API.post(`/students/${id}/documents`, data);
export const updateDocumentStatus = (id, docId, data) => API.patch(`/students/${id}/documents/${docId}`, data);
export const deleteStudent = (id) => API.delete(`/students/${id}`);
