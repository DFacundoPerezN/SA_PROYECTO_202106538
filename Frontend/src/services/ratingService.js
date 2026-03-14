import api from './api'

export const ratingService = {
  rateDriver: async ({ driver_id, stars, comment }) => {
    const response = await api.post('/api/drivers/ratings', {
      driver_id,
      stars,
      comment,
    })
    return response.data
  },

  getDriverAverage: async (driverId) => {
    const response = await api.get(`/api/ratings/driver/${driverId}/average`)
    return response.data
  },

  rateRestaurant: async ({ restaurant_id, stars, comment }) => {
    const response = await api.post('/api/restaurants/ratings', {
      restaurant_id,
      stars,
      comment,
    })
    return response.data
  },

  getRestaurantAverage: async (restaurantId) => {
    const response = await api.get(`/api/ratings/restaurant/${restaurantId}/average`)
    return response.data
  },

  recommendProduct: async ({ product_id, recommended }) => {
    const response = await api.post('/api/products/recommendations', {
      product_id,
      recommended,
    })
    return response.data
  },

  getProductRecommendation: async (productId) => {
    const response = await api.get(`/api/products/${productId}/recommendation`)
    return response.data
  },
}
