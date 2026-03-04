import api from './api'

export const convertService = {
  // Obtener el tipo de cambio entre dos monedas
  getExchangeRate: async (fromCurrency, toCurrency) => {
    try {
      const response = await api.get('/api/convert/exchange-rate', {
        params: {
          from: fromCurrency,
          to: toCurrency
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
      throw error
    }
  },

  // Convertir un monto entre dos monedas
  convertCurrency: async (amount, fromCurrency, toCurrency) => {
    try {
      const response = await api.post('/api/convert/currency', {
        amount,
        from_currency: fromCurrency,
        to_currency: toCurrency
      })
      return response.data
    } catch (error) {
      console.error('Error converting currency:', error)
      throw error
    }
  }
}
