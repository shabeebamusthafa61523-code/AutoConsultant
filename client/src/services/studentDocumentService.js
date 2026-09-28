import API from './api';

export const getStudentDocuments = (params) => API.get('/student-documents', { params });

export const getStudentDocumentById = (id) => API.get(`/student-documents/${id}`);

export const createStudentDocument = (formData) => {
  return API.post('/student-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const verifyStudentDocument = (id, data) => API.put(`/student-documents/${id}/verify`, data);

export const rejectStudentDocument = (id, data) => API.put(`/student-documents/${id}/reject`, data);

export const updateStudentDocument = (id, formData) => {
  return API.put(`/student-documents/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const deleteStudentDocument = (id) => API.delete(`/student-documents/${id}`);

export const getStudentReadiness = (studentId) => API.get(`/student-documents/student/${studentId}/readiness`);

export const getDocumentFileUrl = (id) => `/api/student-documents/${id}/file`;
