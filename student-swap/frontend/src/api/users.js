import client from './client';

export const getProfile = () => client.get('/users/profile');
export const updateProfile = (data) => client.put('/users/profile', data);
export const getPublicProfile = (id) => client.get(`/users/${id}`);
export const getMyListings = (status) => client.get('/users/my-listings', { params: status ? { status } : {} });
export const getUserListings = (id) => client.get(`/users/${id}/listings`);
export const getLikedListings = () => client.get('/users/liked');
export const getWatchlist = () => client.get('/users/watchlist');
export const toggleWatchlist = (id) => client.post(`/users/watchlist/${id}`);
