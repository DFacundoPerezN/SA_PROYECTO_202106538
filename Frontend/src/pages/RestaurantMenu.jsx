import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { orderService } from '../services/orderService'
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

  const loadRestaurantData = () => {
    const savedRestaurant = localStorage.getItem('currentRestaurant')
    if (savedRestaurant) {
      setRestaurant(JSON.parse(savedRestaurant))
    }
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

  // Crear orden
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

      const response = await orderService.createOrder(orderData)
      
      // Orden creada exitosamente
      alert(`¡Orden #${response.order_id} creada exitosamente!\nEstado: ${response.estado}`)
      
      // Limpiar carrito
      setCart([])
      setShowCart(false)
      
      // Opcional: Redirigir a página de órdenes
      // navigate('/cliente/orders')
      
    } catch (err) {
      console.error('Error creating order:', err)
      const errorMessage = err.response?.data?.error || 'Error al crear la orden'
      setError(errorMessage)
      alert('Error: ' + errorMessage)
    } finally {
      setOrderLoading(false)
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
                    <p>${item.precio.toFixed(2)} c/u</p>
                  </div>
                  
                  <div className="cart-item-controls">
                    <div className="quantity-controls">
                      <button onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}>-</button>
                      <span>{item.cantidad}</span>
                      <button onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}>+</button>
                    </div>
                    <span className="item-total">${(item.precio * item.cantidad).toFixed(2)}</span>
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
              <h3>Total: ${calculateTotal().toFixed(2)}</h3>
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
                              ${product.precio.toFixed(2)}
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
    </div>
  )
}

export default RestaurantMenu