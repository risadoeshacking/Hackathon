import client from './client';

export const getRecommendations = (limit) => client.get('/recommendations', { params: { limit } });
export const getBehaviorStats = () => client.get('/recommendations/stats');
