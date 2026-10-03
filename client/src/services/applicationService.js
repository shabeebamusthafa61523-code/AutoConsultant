import api from './api';

export const getApplications = async (params = {}) => {
  const response = await api.get('/applications', { params });
  return response?.data !== undefined ? response.data : response;
};

export const getApplicationById = async (id) => {
  const response = await api.get(`/applications/${id}`);
  return response?.data !== undefined ? response.data : response;
};

export const createApplication = async (applicationData) => {
  const response = await api.post('/applications', applicationData);
  return response?.data !== undefined ? response.data : response;
};

export const updateApplication = async (id, applicationData) => {
  const response = await api.put(`/applications/${id}`, applicationData);
  return response?.data !== undefined ? response.data : response;
};

export const updateApplicationStage = async (id, stageData) => {
  const response = await api.patch(`/applications/${id}/stage`, stageData);
  return response?.data !== undefined ? response.data : response;
};

export const updateNextAction = async (id, nextActionData) => {
  const response = await api.patch(`/applications/${id}/next-action`, nextActionData);
  return response?.data !== undefined ? response.data : response;
};

export const getStudentApplications = async (studentId) => {
  const response = await api.get(`/applications/student/${studentId}`);
  return response?.data !== undefined ? response.data : response;
};

export const deleteApplication = async (id) => {
  const response = await api.delete(`/applications/${id}`);
  return response?.data !== undefined ? response.data : response;
};
