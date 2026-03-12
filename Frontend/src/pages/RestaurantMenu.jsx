import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { orderService } from '../services/orderService'
import { convertService } from '../services/convertService'
import api from '../services/api'
import '../styles/Dashboard.css'

const RestaurantMenu = () => {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [restaurant, setRestaurant] = useState(null)
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)
  const [showCart, setShowCart] = useState(false)

  // ESTADOS PARA PAGO
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    cupon: ''
  })
  const [processingPayment, setProcessingPayment] = useState(false)

  // Conversión de moneda
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [convertedPrices, setConvertedPrices] = useState({})
  const [convertingLoading, setConvertingLoading] = useState(false)
  const [convertingError, setConvertingError] = useState('')

  // Formulario de entrega
  const [deliveryForm, setDeliveryForm] = useState({
    direccion_entrega: '',
    latitud: 14.6349,
    longitud: -90.5069,
    cliente_telefono: user?.telefono || ''
  })

  useEffect(() => {
    loadRestaurantData()
    fetchProducts()
  }, [restaurantId])

  // Convertir precios cuando cambia la moneda o los productos
  useEffect(() => {
    if (selectedCurrency !== 'USD' && products.length > 0) {
      convertAllPrices()
    } else {
      setConvertedPrices({})
    }
  }, [selectedCurrency, products])

  const loadRestaurantData = () => {
    const savedRestaurant = localStorage.getItem('currentRestaurant')
    if (savedRestaurant) {
      setRestaurant(JSON.parse(savedRestaurant))
    }
  }

  const convertAllPrices = async () => {
    try {
      setConvertingLoading(true)
      setConvertingError('')
      const newConvertedPrices = {}

      // Crear un set de precios únicos para reducir llamadas a la API
      const uniquePrices = [...new Set(products.map(p => p.precio))]

      for (const price of uniquePrices) {
        try {
          const result = await convertService.convertCurrency(
            price,
            'USD',
            selectedCurrency
          )
          newConvertedPrices[price] = result.amount_to || result.converted_amount
        } catch (priceErr) {
          console.warn(`Error converting price ${price}:`, priceErr)
          newConvertedPrices[price] = price
        }
      }

      setConvertedPrices(newConvertedPrices)
    } catch (err) {
      console.error('Error converting prices:', err)
      setConvertingError('Error al convertir precios')
    } finally {
      setConvertingLoading(false)
    }
  }

  const handleCurrencyChange = (e) => {
    setSelectedCurrency(e.target.value)
  }

  const getDisplayPrice = (priceUSD) => {
    if (selectedCurrency === 'USD') {
      return `$${priceUSD.toFixed(2)}`
    }
    if (convertedPrices[priceUSD]) {
      return `${convertedPrices[priceUSD].toFixed(2)} ${selectedCurrency}`
    }
    return `$${priceUSD.toFixed(2)}`
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/restaurants/${restaurantId}/products`)
      setProducts(response.data.products || [])
      setError('')
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('Error al cargar el menú')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const handleBack = () => {
    navigate('/cliente/dashboard')
  }

  // Agregar producto al carrito
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.producto_id === product.id)
    
    if (existingItem) {
      // Incrementar cantidad
      setCart(cart.map(item =>
        item.producto_id === product.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      // Agregar nuevo item
      setCart([...cart, {
        producto_id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad: 1,
        comentarios: ''
      }])
    }
    setShowCart(true)
  }

  // Remover del carrito
  const removeFromCart = (productoId) => {
    setCart(cart.filter(item => item.producto_id !== productoId))
  }

  // Actualizar cantidad
  const updateQuantity = (productoId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productoId)
    } else {
      setCart(cart.map(item =>
        item.producto_id === productoId
          ? { ...item, cantidad: newQuantity }
          : item
      ))
    }
  }

  // Actualizar comentarios
  const updateComments = (productoId, comentarios) => {
    setCart(cart.map(item =>
      item.producto_id === productoId
        ? { ...item, comentarios }
        : item
    ))
  }

  // Calcular total
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.precio * item.cantidad), 0)
  }

  // Calcular total con conversión
  const getDisplayTotal = () => {
    const totalUSD = calculateTotal()
    return getDisplayPrice(totalUSD)
  }

  // Crear orden
  // Paso 1: Crear orden (sin pago todavía)
  const handleCreateOrder = async () => {
    if (!deliveryForm.direccion_entrega.trim()) {
      alert('Por favor ingresa una dirección de entrega')
      return
    }

    if (cart.length === 0) {
      alert('El carrito está vacío')
      return
    }

    setOrderLoading(true)
    setError('')

    try {
      const orderData = {
        restaurante_id: parseInt(restaurantId),
        direccion_entrega: deliveryForm.direccion_entrega,
        latitud: deliveryForm.latitud,
        longitud: deliveryForm.longitud,
        items: cart.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          comentarios: item.comentarios || ''
        })),
        cliente_nombre: user?.name || 'Cliente',
        cliente_telefono: deliveryForm.cliente_telefono,
        nombre_restaurante: restaurant?.nombre || ''
      }

      console.log('Creando orden con datos:', orderData)
      const response = await orderService.createOrder(orderData)
      
      // Guardar el order_id para el pago
      setCreatedOrderId(response.order_id)
      
      // Cerrar carrito y abrir modal de pago
      setShowCart(false)
      setShowPaymentModal(true)
      
    } catch (err) {
      console.error('Error creating order:', err)
      const errorMessage = err.response?.data?.error || 'Error al crear la orden'
      setError(errorMessage)
      alert('Error: ' + errorMessage)
    } finally {
      setOrderLoading(false)
    }
  }

  // Paso 2: Procesar pago
  const handleProcessPayment = async (e) => {
    e.preventDefault()
    
    // Validar datos de tarjeta
    if (!paymentForm.cardNumber || paymentForm.cardNumber.length < 16) {
      alert('Número de tarjeta inválido')
      return
    }
    
    if (!paymentForm.cardName.trim()) {
      alert('Nombre en la tarjeta requerido')
      return
    }
    
    if (!paymentForm.expiryDate || paymentForm.expiryDate.length < 5) {
      alert('Fecha de expiración inválida')
      return
    }
    
    if (!paymentForm.cvv || paymentForm.cvv.length < 3) {
      alert('CVV inválido')
      return
    }

    setProcessingPayment(true)
    setError('')

    try {
      const total = calculateTotal()
      
      const paymentData = {
        order_id: createdOrderId,
        payment_method: 'TARJETA',
        use_cupon: paymentForm.cupon.trim() !== '',
        amount: total
      }

      const response = await api.post('/api/payments', paymentData)
      
      // Pago exitoso
      alert(`¡Pago procesado exitosamente!\n\nPago ID: ${response.data.payment_id}\nEstado: ${response.data.status}\n\n${response.data.message}`)
      
      // Limpiar todo
      setShowPaymentModal(false)
      setCreatedOrderId(null)
      setCart([])
      resetPaymentForm()
      
      // Opcional: Redirigir a página de órdenes
      // navigate('/cliente/orders')
      
    } catch (err) {
      console.error('Error processing payment:', err)
      const errorMessage = err.response?.data?.error || 'Error al procesar el pago'
      setError(errorMessage)
      alert('Error en el pago: ' + errorMessage)
    } finally {
      setProcessingPayment(false)
    }
  }

  const resetPaymentForm = () => {
    setPaymentForm({
      cardNumber: '',
      cardName: '',
      expiryDate: '',
      cvv: '',
      cupon: ''
    })
  }

  // Formatear número de tarjeta (espacios cada 4 dígitos)
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return value
    }
  }

  // Formatear fecha de expiración (MM/YY)
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    if (formatted.replace(/\s/g, '').length <= 16) {
      setPaymentForm({ ...paymentForm, cardNumber: formatted })
    }
  }

  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value)
    if (formatted.replace(/\//g, '').length <= 4) {
      setPaymentForm({ ...paymentForm, expiryDate: formatted })
    }
  }

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/gi, '')
    if (value.length <= 4) {
      setPaymentForm({ ...paymentForm, cvv: value })
    }
  }

  // Agrupar productos por categoría
  const productsByCategory = products.reduce((acc, product) => {
    const category = product.categoria || 'Sin categoría'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(product)
    return acc
  }, {})

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="logo-icon">🚀</div>
          <div className="logo-text">DeliveryApp</div>
        </div>
        <div className="nav-user">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">Cliente</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={handleBack} className="btn-back">
            ← Volver a Restaurantes
          </button>
          
          {cart.length > 0 && (
            <button 
              onClick={() => setShowCart(!showCart)} 
              className="btn-cart"
            >
              🛒 Carrito ({cart.length})
            </button>
          )}
        </div>

        {restaurant && (
          <div className="restaurant-header">
            <div className="restaurant-header-info">
              <h1>{restaurant.nombre}</h1>
              <div className="restaurant-meta">
                {restaurant.calificacion && (
                  <span>⭐ {restaurant.calificacion.toFixed(1)}</span>
                )}
                {restaurant.direccion && (
                  <span>📍 {restaurant.direccion}</span>
                )}
                {restaurant.telefono && (
                  <span>📞 {restaurant.telefono}</span>
                )}
                <span>
                  💱 
                  <select
                    value={selectedCurrency}
                    onChange={handleCurrencyChange}
                    style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                  >
                    <option value="USD">USD</option>
                    <option value="GTQ">GTQ</option>
                    <option value="MXN">MXN</option>
                    <option value="COP">COP</option>
                    <option value="PEN">PEN</option>
                    <option value="CLP">CLP</option>
                    <option value="ARS">ARS</option>
                    <option value="BRL">BRL</option>
                  </select>
                  {convertingLoading && <small style={{ marginLeft: '0.5rem' }}>⏳</small>}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Carrito lateral */}
        {showCart && cart.length > 0 && (
          <div className="cart-sidebar">
            <div className="cart-header">
              <h3>Tu Pedido</h3>
              <button onClick={() => setShowCart(false)} className="btn-close">✕</button>
            </div>

            <div className="cart-items">
              {cart.map(item => (
                <div key={item.producto_id} className="cart-item">
                  <div className="cart-item-info">
                    <h4>{item.nombre}</h4>
                    <p>{getDisplayPrice(item.precio)} c/u</p>
                  </div>
                  
                  <div className="cart-item-controls">
                    <div className="quantity-controls">
                      <button onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}>-</button>
                      <span>{item.cantidad}</span>
                      <button onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}>+</button>
                    </div>
                    <span className="item-total">{getDisplayPrice(item.precio * item.cantidad)}</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Comentarios (opcional)"
                    value={item.comentarios}
                    onChange={(e) => updateComments(item.producto_id, e.target.value)}
                    className="cart-item-comments"
                  />
                  
                  <button 
                    onClick={() => removeFromCart(item.producto_id)}
                    className="btn-remove"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-delivery">
              <h4>Información de Entrega</h4>
              
              <div className="form-group">
                <label>Dirección de entrega *</label>
                <input
                  type="text"
                  placeholder="Ej: Mi casa zona 12"
                  value={deliveryForm.direccion_entrega}
                  onChange={(e) => setDeliveryForm({...deliveryForm, direccion_entrega: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Teléfono de contacto</label>
                <input
                  type="tel"
                  placeholder="+505 5505550"
                  value={deliveryForm.cliente_telefono}
                  onChange={(e) => setDeliveryForm({...deliveryForm, cliente_telefono: e.target.value})}
                  className="form-input"
                />
              </div>
            </div>

            <div className="cart-total">
              <h3>Total: {getDisplayTotal()}</h3>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginTop: '10px' }}>
                {error}
              </div>
            )}

            <button 
              onClick={handleCreateOrder}
              disabled={orderLoading || cart.length === 0}
              className="btn-order"
            >
              {orderLoading ? 'Procesando...' : 'Realizar Pedido'}
            </button>
          </div>
        )}

        <div className="menu-section">
          <h2>Menú</h2>
          
          {error && !showCart && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Cargando menú...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <p>No hay productos disponibles</p>
              <small>Este restaurante aún no tiene productos en su menú</small>
            </div>
          ) : (
            <div className="menu-categories">
              {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category} className="menu-category">
                  <h3 className="category-title">{category}</h3>
                  <div className="products-grid">
                    {categoryProducts.map((product) => (
                      <div key={product.id} className="product-card">
                        <div className="product-info">
                          <h4>{product.nombre}</h4>
                          {product.descripcion && (
                            <p className="product-description">{product.descripcion}</p>
                          )}
                          <div className="product-footer">
                            <span className="product-price">
                              {getDisplayPrice(product.precio)}
                            </span>
                            {!product.disponible && (
                              <span className="product-unavailable">No disponible</span>
                            )}
                          </div>
                        </div>
                        <button 
                          className="btn-add-to-cart"
                          disabled={!product.disponible}
                          onClick={() => addToCart(product)}
                        >
                          {product.disponible ? 'Agregar' : 'Agotado'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
{/* Modal de Pago */}
      {showPaymentModal && (
        <div className="cart-sidebar" style={{ zIndex: 1001 }}>
          <div className="cart-header">
            <h3>💳 Procesar Pago</h3>
            <button 
              onClick={() => {
                if (window.confirm('¿Seguro que quieres cancelar el pago? La orden se perderá.')) {
                  setShowPaymentModal(false)
                  setCreatedOrderId(null)
                  resetPaymentForm()
                }
              }} 
              className="btn-close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleProcessPayment} style={{ padding: '20px' }}>
            <div style={{ 
              background: 'rgba(76, 175, 80, 0.1)', 
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#4caf50', marginBottom: '8px' }}>
                ✓ Orden creada exitosamente
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Orden ID: #{createdOrderId}
              </div>
            </div>

            <div style={{ 
              background: 'rgba(33, 150, 243, 0.05)',
              border: '1px solid rgba(33, 150, 243, 0.2)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#333', textAlign: 'center' }}>
                Total a Pagar: ${calculateTotal().toFixed(2)}
              </div>
            </div>

            <h4 style={{ fontSize: '16px', color: '#333', marginBottom: '16px' }}>
              Información de Tarjeta
            </h4>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: '#666', 
                marginBottom: '6px' 
              }}>
                Número de Tarjeta *
              </label>
              <input
                type="text"
                value={paymentForm.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: '#666', 
                marginBottom: '6px' 
              }}>
                Nombre en la Tarjeta *
              </label>
              <input
                type="text"
                value={paymentForm.cardName}
                onChange={(e) => setPaymentForm({ ...paymentForm, cardName: e.target.value.toUpperCase() })}
                placeholder="JUAN PEREZ"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  textTransform: 'uppercase'
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  color: '#666', 
                  marginBottom: '6px' 
                }}>
                  Fecha Exp. *
                </label>
                <input
                  type="text"
                  value={paymentForm.expiryDate}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  color: '#666', 
                  marginBottom: '6px' 
                }}>
                  CVV *
                </label>
                <input
                  type="password"
                  value={paymentForm.cvv}
                  onChange={handleCvvChange}
                  placeholder="123"
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                  maxLength="4"
                  required
                />
              </div>
            </div>

            <div style={{
              borderTop: '1px solid #eee',
              paddingTop: '16px',
              marginTop: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{ fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                ¿Tienes un cupón? (Opcional)
              </h4>
              <input
                type="text"
                value={paymentForm.cupon}
                onChange={(e) => setPaymentForm({ ...paymentForm, cupon: e.target.value.toUpperCase() })}
                placeholder="CODIGO-DESCUENTO"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  textTransform: 'uppercase'
                }}
              />
              {paymentForm.cupon && (
                <small style={{ 
                  display: 'block', 
                  marginTop: '6px', 
                  color: '#2196f3',
                  fontSize: '12px' 
                }}>
                  ✓ Cupón: {paymentForm.cupon}
                </small>
              )}
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginTop: '10px' }}>
                {error}
              </div>
            )}

            <div style={{
              background: 'rgba(255, 152, 0, 0.05)',
              border: '1px solid rgba(255, 152, 0, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                🔒 Pago simulado - No se realizará cargo real
              </div>
            </div>

            <button 
              type="submit"
              disabled={processingPayment}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #4caf50, #45a049)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: processingPayment ? 'not-allowed' : 'pointer',
                opacity: processingPayment ? 0.6 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              {processingPayment ? '💳 Procesando...' : '✓ Confirmar Pago'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default RestaurantMenu