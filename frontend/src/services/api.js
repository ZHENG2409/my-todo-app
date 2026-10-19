import axios from 'axios';

const api = axios.create({
    // 本地开发时，因为配置了代理，这里就写 /api
    // 如果以后部署到云端，记得换成后端的公网地址
    baseURL: '/api',
});

// 请求拦截器：每次发请求前，自动把 Token 塞进 Headers 里
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const getTodos = () => api.get('/todos');
export const createTodo = (data) => api.post('/todos', data);
export const updateTodo = (id, data) => api.put(`/todos/${id}`, data);
export const deleteTodo = (id) => api.delete(`/todos/${id}`);

// 新增：登录和注册接口
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);

// 响应拦截器：如果 Token 过期或未授权，自动踢回登录页
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/login'; // 强制跳回登录页
        }
        return Promise.reject(error);
    }
);