import API from './api';

export const getCourseFees = (params = {}) => API.get('/course-fees', { params });
export const getCourseFeeById = (id) => API.get(`/course-fees/${id}`);
export const createCourseFee = (data) => API.post('/course-fees', data);
export const updateCourseFee = (id, data) => API.put(`/course-fees/${id}`, data);
export const deleteCourseFee = (id) => API.delete(`/course-fees/${id}`);
