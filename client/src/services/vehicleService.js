import API from './api';

export const getVehicles = (params) => API.get('/vehicles', { params });

export const getVehicleById = (id) => API.get(`/vehicles/${id}`);

export const createVehicle = (data) => API.post('/vehicles', data);

export const updateVehicle = (id, data) => API.put(`/vehicles/${id}`, data);

export const updateVehicleCompliance = (id, data) => API.put(`/vehicles/${id}/compliance`, data);

export const deleteVehicle = (id) => API.delete(`/vehicles/${id}`);

export const getVehicleMaintenance = (id) => API.get(`/vehicles/${id}/maintenance`);

export const addVehicleMaintenance = (id, data) => API.post(`/vehicles/${id}/maintenance`, data);

export const getVehicleFuel = (id) => API.get(`/vehicles/${id}/fuel`);

export const addVehicleFuel = (id, data) => API.post(`/vehicles/${id}/fuel`, data);

export const getVehicleComplianceAlerts = () => API.get('/vehicles/alerts/expiries');

export const checkVehicleAvailability = (data) => API.post('/vehicles/check-availability', data);
