import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stocksense_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ---------- Auth ----------
export const signup = (payload) => api.post('/auth/signup', payload).then((r) => r.data);
export const login = (payload) => api.post('/auth/login', payload).then((r) => r.data);
export const getMe = () => api.get('/auth/me').then((r) => r.data);
export const updateProfile = (payload) => api.patch('/auth/me', payload).then((r) => r.data);
export const changePassword = (payload) => api.post('/auth/change-password', payload).then((r) => r.data);

// ---------- Products ----------
export const getProducts = () => api.get('/products').then((r) => r.data);
export const createProduct = (payload) => api.post('/products', payload).then((r) => r.data);
export const updateProduct = (id, payload) => api.patch(`/products/${id}`, payload).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data);

// ---------- Sales ----------
export const getSales = (limit = 50) => api.get(`/sales?limit=${limit}`).then((r) => r.data);
export const logSale = (payload) => api.post('/sales', payload).then((r) => r.data);

// ---------- Customers & Credit (Udhaar) ----------
export const getCustomers = () => api.get('/customers').then((r) => r.data);
export const createCustomer = (payload) => api.post('/customers', payload).then((r) => r.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then((r) => r.data);
export const updateCustomer = (id, payload) => api.patch(`/customers/${id}`, payload).then((r) => r.data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then((r) => r.data);
export const getCustomerTransactions = (id) => api.get(`/customers/${id}/transactions`).then((r) => r.data);
export const addCustomerTransaction = (id, payload) => api.post(`/customers/${id}/transactions`, payload).then((r) => r.data);

// ---------- Stock ----------
export const getStock = () => api.get('/stock').then((r) => r.data);

// ---------- Alerts ----------
export const getAlerts = () => api.get('/alerts').then((r) => r.data);
export const resolveAlert = (id) => api.post(`/alerts/${id}/resolve`).then((r) => r.data);

// ---------- Analytics ----------
export const getSummary = () => api.get('/analytics/summary').then((r) => r.data);
export const getSalesTrend = (days = 14) => api.get(`/analytics/sales-trend?days=${days}`).then((r) => r.data);
export const getCategoryBreakdown = () => api.get('/analytics/category-breakdown').then((r) => r.data);
export const getTopMovers = (limit = 6) => api.get(`/analytics/top-movers?limit=${limit}`).then((r) => r.data);
