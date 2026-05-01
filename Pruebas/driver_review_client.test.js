const axios = require('axios')

const BASE_URL = 'http://localhost:8080/api'
const PASSWORD = 'example1973'
const RUN_DRIVER_CLIENT_REVIEW_TESTS = process.env.RUN_DRIVER_CLIENT_REVIEW_TESTS === '1'
const describeIfEnabled = RUN_DRIVER_CLIENT_REVIEW_TESTS ? describe : describe.skip

jest.setTimeout(30000)

const apiCall = (config) => {
  return axios({
    validateStatus: () => true,
    ...config,
  })
}

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` })

const registerUser = async (role, seed) => {
  const email = `${role.toLowerCase()}_${seed}_${Math.floor(Math.random() * 100000)}@mail.com`

  const response = await apiCall({
    method: 'post',
    url: `${BASE_URL}/users`,
    data: {
      email,
      password: PASSWORD,
      name: `${role}_${seed}`,
      role,
    },
  })

  expect(response.status).toBe(201)

  return {
    id: Number(response.data?.id),
    email,
  }
}

const login = async (email) => {
  const response = await apiCall({
    method: 'post',
    url: `${BASE_URL}/auth/login`,
    data: {
      email,
      password: PASSWORD,
    },
  })

  expect(response.status).toBe(200)
  expect(typeof response.data?.token).toBe('string')

  return {
    token: response.data.token,
    userId: Number(response.data?.id),
  }
}

const getRestaurantAndProduct = async () => {
  const restaurantsResponse = await apiCall({
    method: 'get',
    url: `${BASE_URL}/restaurants`,
  })

  expect(restaurantsResponse.status).toBe(200)

  const restaurants = Array.isArray(restaurantsResponse.data)
    ? restaurantsResponse.data
    : restaurantsResponse.data?.restaurants || []

  expect(restaurants.length).toBeGreaterThan(0)

  const restaurant = restaurants[0]

  const productsResponse = await apiCall({
    method: 'get',
    url: `${BASE_URL}/restaurants/${restaurant.id}/products`,
  })

  expect(productsResponse.status).toBe(200)

  const products = productsResponse.data?.products || []
  expect(products.length).toBeGreaterThan(0)

  return {
    restaurant,
    product: products[0],
  }
}

const createOrder = async ({ token, clientId, restaurant, product }) => {
  const response = await apiCall({
    method: 'post',
    url: `${BASE_URL}/orders`,
    headers: authHeaders(token),
    data: {
      restaurante_id: Number(restaurant.id),
      nombre_restaurante: restaurant.nombre || `Restaurante #${restaurant.id}`,
      cliente_id: Number(clientId),
      cliente_nombre: 'Cliente Prueba',
      cliente_telefono: '5555-5555',
      direccion_entrega: 'Dirección de prueba zona 10',
      latitud: 14.621,
      longitud: -90.522,
      items: [
        {
          producto_id: Number(product.id),
          cantidad: 1,
          comentarios: 'sin cebolla',
        },
      ],
      monto_descuento: 0,
    },
  })

  expect(response.status).toBe(200)
  expect(Number(response.data?.order_id)).toBeGreaterThan(0)

  return Number(response.data.order_id)
}

const assignOrderToDriver = async ({ token, orderId }) => {
  const response = await apiCall({
    method: 'put',
    url: `${BASE_URL}/orders/${orderId}/assign`,
    headers: authHeaders(token),
  })

  expect(response.status).toBe(200)
}

const markOrderDelivered = async ({ token, orderId }) => {
  const response = await apiCall({
    method: 'patch',
    url: `${BASE_URL}/orders/${orderId}/status`,
    headers: authHeaders(token),
    data: {
      status: 'ENTREGADA',
    },
  })

  expect(response.status).toBe(200)
}

describeIfEnabled('POST /api/clients/ratings', () => {
  let driver
  let client
  let driverAuth
  let clientAuth
  let baseOrderId
  let restaurant
  let product

  beforeAll(async () => {
    const seed = Date.now()

    client = await registerUser('CLIENTE', seed)
    driver = await registerUser('REPARTIDOR', seed)

    clientAuth = await login(client.email)
    driverAuth = await login(driver.email)

    const seedData = await getRestaurantAndProduct()
    restaurant = seedData.restaurant
    product = seedData.product

    baseOrderId = await createOrder({
      token: clientAuth.token,
      clientId: client.id,
      restaurant,
      product,
    })

    await assignOrderToDriver({ token: driverAuth.token, orderId: baseOrderId })
    await markOrderDelivered({ token: driverAuth.token, orderId: baseOrderId })
  })

  test('registra review de repartidor a cliente en orden entregada', async () => {
    const response = await apiCall({
      method: 'post',
      url: `${BASE_URL}/clients/ratings`,
      headers: authHeaders(driverAuth.token),
      data: {
        client_id: client.id,
        order_id: baseOrderId,
        stars: 5,
        comment: 'Cliente colaborador y puntual',
      },
    })

    expect(response.status).toBe(200)
    expect(Number(response.data?.rating_id)).toBeGreaterThan(0)
  })

  test('rechaza rol distinto de repartidor', async () => {
    const response = await apiCall({
      method: 'post',
      url: `${BASE_URL}/clients/ratings`,
      headers: authHeaders(clientAuth.token),
      data: {
        client_id: client.id,
        order_id: baseOrderId,
        stars: 5,
        comment: 'Intento inválido',
      },
    })

    expect(response.status).toBe(403)
  })

  test('rechaza review duplicada para la misma orden', async () => {
    const response = await apiCall({
      method: 'post',
      url: `${BASE_URL}/clients/ratings`,
      headers: authHeaders(driverAuth.token),
      data: {
        client_id: client.id,
        order_id: baseOrderId,
        stars: 4,
        comment: 'Segundo intento sobre la misma orden',
      },
    })

    expect(response.status).toBe(409)
  })

  test('rechaza cuando la orden no está entregada', async () => {
    const pendingOrderId = await createOrder({
      token: clientAuth.token,
      clientId: client.id,
      restaurant,
      product,
    })

    await assignOrderToDriver({ token: driverAuth.token, orderId: pendingOrderId })

    const response = await apiCall({
      method: 'post',
      url: `${BASE_URL}/clients/ratings`,
      headers: authHeaders(driverAuth.token),
      data: {
        client_id: client.id,
        order_id: pendingOrderId,
        stars: 5,
        comment: 'No debería permitir',
      },
    })

    expect(response.status).toBe(403)
  })

  test('valida rango de estrellas', async () => {
    const response = await apiCall({
      method: 'post',
      url: `${BASE_URL}/clients/ratings`,
      headers: authHeaders(driverAuth.token),
      data: {
        client_id: client.id,
        order_id: baseOrderId,
        stars: 6,
        comment: 'Fuera de rango',
      },
    })

    expect(response.status).toBe(400)
  })
})
