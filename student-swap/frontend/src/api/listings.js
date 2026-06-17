import client from "./client";

export const getListings = (params) => client.get("/listings", { params });
export const getListing = (id) => client.get(`/listings/${id}`);
export const createListing = (data) => client.post("/listings", data);
export const updateListing = (id, data) => client.put(`/listings/${id}`, data);
export const deleteListing = (id) => client.delete(`/listings/${id}`);
export const markSold = (id) => client.patch(`/listings/${id}/sold`);
export const toggleLike = (id) => client.post(`/listings/${id}/like`);
export const reportListing = (id, reason) =>
  client.post(`/listings/${id}/report`, { reason });
export const getCategories = () => client.get("/listings/categories");
export const uploadImage = (file) => {
  const form = new FormData();
  form.append("image", file);
  return client.post("/listings/upload-image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Watchlist
export const getWatchlist = () => client.get("/listings/watchlist");
export const toggleWatchlist = (id) => client.post(`/listings/${id}/watchlist`);
