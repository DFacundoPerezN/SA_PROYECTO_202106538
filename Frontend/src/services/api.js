import axios from 'axios'

const DEFAULT_API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : window.location.origin

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')

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
      localStorage.removeItem('token')
      localStorage.removeItem('name')
      localStorage.removeItem('role')
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  },
  register: async (userData) => {
    const response = await api.post('/api/users', userData)
    return response.data
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('name')
    localStorage.removeItem('role')
  },
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
  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  },
}

export const restaurantService = {
  getAll: async () => {
    const response = await api.get('/api/restaurants')
    return response.data
  },
  create: async (restaurantData) => {
    const response = await api.post('/api/restaurants', restaurantData)
    return response.data
  },
  getById: async (id) => {
    const response = await api.get(`/api/restaurants/${id}`)
    return response.data
  },
}

// ─── Servicio de Promociones ──────────────────────────────────────────────────
export const promocionService = {
  // GET con filtros opcionales
  // Params: { restaurante_id, solo_activas, tipo, fecha_desde, fecha_hasta }
  getAll: async (params = {}) => {
    const response = await api.get('/api/promociones', { params })
    return response.data // { promociones: [...] }
  },

  // Helper para el cliente: activas de un restaurante específico
  getActivasByRestaurante: async (restauranteId) => {
    const response = await api.get('/api/promociones', {
      params: { restaurante_id: restauranteId, solo_activas: true },
    })
    return response.data.promociones || []
  },

  // POST /api/restaurants/:id/promociones  (protegido)
  create: async (restauranteId, data) => {
    const response = await api.post(`/api/restaurants/${restauranteId}/promociones`, data)
    return response.data
  },

  // PUT /api/promociones/:id  (protegido)
  update: async (id, data) => {
    const response = await api.put(`/api/promociones/${id}`, data)
    return response.data
  },
}

// ─── Servicio de Cupones ──────────────────────────────────────────────────────
export const cuponService = {
  // GET /api/cupones con filtros opcionales
  getAll: async (params = {}) => {
    const response = await api.get('/api/cupones', { params })
    return response.data // { cupones: [...] }
  },

  // POST /api/restaurants/:id/cupones  (protegido — restaurante)
  create: async (restauranteId, data) => {
    const response = await api.post(`/api/restaurants/${restauranteId}/cupones`, data)
    return response.data
  },

  // PUT /api/cupones/:id  (protegido — restaurante, sin campo autorizado)
  update: async (id, data) => {
    const response = await api.put(`/api/cupones/${id}`, data)
    return response.data
  },

  // PATCH /api/cupones/:id/autorizar  (protegido — solo admin)
  autorizar: async (id, autorizado) => {
    const response = await api.patch(`/api/cupones/${id}/autorizar`, { autorizado })
    return response.data
  },

  // Incrementar el número de usos del cupón (protegido — solo backend)
  incrementUso: async (id) => {
    console.log(`Incrementando uso del cupón ID ${id} en backend...`)
    const response = await api.post(`/api/cupones/${id}/incrementar-uso`)
    return response.data
  },

  verificarExpiracion: async (id) => {
    console.log(`Verificando expiración del cupón ID ${id} en backend...`)
    const response = await api.post(`/api/cupones/${id}/verificar-expiracion`)
    return response.data
  },
}

export default api
