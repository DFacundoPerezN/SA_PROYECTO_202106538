import axios from 'axios'

// Configura aquí la URL de tu backend
const API_BASE_URL = 'http://20.49.4.20:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token')
      localStorage.removeItem('name')
      localStorage.removeItem('role')
      //window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  },

  // Registro
  register: async (userData) => {
    const response = await api.post('/api/users', userData)
    return response.data
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('name')
    localStorage.removeItem('role')
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch (e) {
        console.error('Error parsing user data:', e)
        return null
      }
    }
    return null
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  },
}

export const restaurantService = {
  // Obtener todos los restaurantes
  getAll: async () => {
    const response = await api.get('/api/restaurants')
    return response.data
  },

  // Crear restaurante
  create: async (restaurantData) => {
    const response = await api.post('/api/restaurants', restaurantData)
    return response.data
  },

  // Obtener restaurante por ID
  getById: async (id) => {
    const response = await api.get(`/api/restaurants/${id}`)
    return response.data
  }
}

export default api
