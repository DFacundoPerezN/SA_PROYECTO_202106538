import api from './api'

export const orderService = {
  // Crear una nueva orden
  createOrder: async (orderData) => {
    const response = await api.post('/api/orders', orderData)
    return response.data
  },

  // Obtener el historial de ordenes del cliente autenticado
  getMyOrders: async () => {
    const response = await api.get('/api/orders/me')
    return response.data
  },

  // Obtener ordenes entregadas (completadas) del cliente autenticado
  getDeliveredOrders: async () => {
    const response = await api.get('/api/orders/delivered')
    return response.data
  },

  // Obtener ordenes del repartidor autenticado
  getMyDriverOrders: async () => {
    const response = await api.get('/api/orders/driver/me')
    return response.data
  },
}
