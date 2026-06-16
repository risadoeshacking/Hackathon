import axios from 'axios';
import client from './client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const getStats = () => client.get('/admin/stats');
export const getPendingListings = (params) => client.get('/admin/listings', { params });
export const approveListing = (id) => client.patch(`/admin/listings/${id}/approve`);
export const removeListing = (id, data) => client.patch(`/admin/listings/${id}/remove`, data);
export const getReports = (params) => client.get('/admin/reports', { params });
export const reviewReport = (id, data) => client.patch(`/admin/reports/${id}`, data);
export const getUsers = (params) => client.get('/admin/users', { params });
export const updateUser = (id, data) => client.patch(`/admin/users/${id}`, data);

// School settings
export const getSchool = () => client.get('/admin/school');
export const updateSchool = (data) => client.put('/admin/school', data);
export const uploadLogo = (file) => {
  const form = new FormData();
  form.append('logo', file);
  return client.post('/admin/school/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Categories
export const getCategories = () => client.get('/admin/categories');
export const createCategory = (data) => client.post('/admin/categories', data);
export const updateCategory = (id, data) => client.put(`/admin/categories/${id}`, data);
export const deleteCategory = (id) => client.delete(`/admin/categories/${id}`);

// Public (no auth)
export const getPublicSchool = () => axios.get(`${BASE}/api/public/school`);
