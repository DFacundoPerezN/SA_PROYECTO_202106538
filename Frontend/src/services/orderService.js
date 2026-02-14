import api from './api'

export const orderService = {
  // Crear una nueva orden
  createOrder: async (orderData) => {
    const response = await api.post('/api/orders', orderData)
    return response.data
  }
}