import API from './api';

export const getClasses = (params = {}) => API.get('/classes', { params });

export const getClassStats = (params = {}) => API.get('/classes/stats', { params });

export const getClassById = (id) => API.get(`/classes/${id}`);

export const createClass = (data) => API.post('/classes', data);

export const updateClass = (id, data) => API.put(`/classes/${id}`, data);

export const deleteClass = (id) => API.delete(`/classes/${id}`);

// Training progress tracker (student-level summary with fee status)
export const getProgressTracker = (params = {}) => API.get('/classes/progress-tracker', { params });

// Daily class schedule roster endpoints
export const getSchedules = (params = {}) => API.get('/classes/schedules', { params });

export const createSchedule = (data) => API.post('/classes/schedules', data);

export const updateSchedule = (id, data) => API.put(`/classes/schedules/${id}`, data);

export const deleteSchedule = (id) => API.delete(`/classes/schedules/${id}`);

export const completeSchedule = (id, data = {}) => API.post(`/classes/schedules/${id}/complete`, data);

export const exportClassesCSV = async (params = {}) => {
  const blob = await API.get('/classes/export', {
    params,
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `training_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const backupClassesJSON = async () => {
  const records = await API.get('/classes', { params: { all: 'true' } });
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
  const link = document.createElement('a');
  link.href = dataStr;
  link.setAttribute('download', `benz_training_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
};
