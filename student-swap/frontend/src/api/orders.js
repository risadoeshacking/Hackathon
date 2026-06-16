import client from './client';

export const getMyOrders = (role) => client.get('/orders', { params: { role } });
export const getOrder = (id) => client.get(`/orders/${id}`);
export const createOrder = (data) => client.post('/orders', data);
export const updateOrderStatus = (id, status) => client.patch(`/orders/${id}/status`, { status });
