import client from './client';

export const signup = (data) => client.post('/auth/signup', data);
export const login = (data) => client.post('/auth/login', data);
export const getMe = () => client.get('/auth/me');
export const changePassword = (data) => client.put('/auth/change-password', data);
