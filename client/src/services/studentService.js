import API from './api';

export const getStudents = (params = {}) => API.get('/students', { params });
export const getStudentById = (id) => API.get(`/students/${id}`);
export const getStudentDetails = (id) => API.get(`/students/${id}/details`);
export const createStudent = (data) => API.post('/students', data);
export const updateStudent = (id, data) => API.put(`/students/${id}`, data);
export const deleteStudent = (id) => API.delete(`/students/${id}`);
