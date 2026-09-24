import API from './api';

export const getInstructors = (params) => API.get('/instructors', { params });

export const getInstructorById = (id) => API.get(`/instructors/${id}`);

export const getInstructorProfile = (id) => API.get(`/instructors/${id}/profile`);

export const createInstructor = (data) => API.post('/instructors', data);

export const updateInstructor = (id, data) => API.put(`/instructors/${id}`, data);

export const deleteInstructor = (id) => API.delete(`/instructors/${id}`);

export const addInstructorCertification = (id, data) => API.post(`/instructors/${id}/certifications`, data);

export const addInstructorDocument = (id, data) => API.post(`/instructors/${id}/documents`, data);

export const checkInstructorAvailability = (data) => API.post('/instructors/check-availability', data);
