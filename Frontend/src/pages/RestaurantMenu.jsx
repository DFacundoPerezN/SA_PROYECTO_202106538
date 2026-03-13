import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { orderService } from '../services/orderService'
import { convertService } from '../services/convertService'
import api from '../services/api'
import '../styles/Dashboard.css'

// ─── Helpers de promoción ─────────────────────────────────────────────────────

const isVigente = (p) => p.activa && new Date(p.fecha_fin) >= new Date()

// Devuelve { subtotal, descuentoMonto, total, promoAplicada }
const calcularTotalConPromo = (subtotalUSD, promociones) => {
  const activas = (promociones || []).filter(isVigente)
  if (activas.length === 0) return { subtotal: subtotalUSD, descuentoMonto: 0, total: subtotalUSD, promoAplicada: null }

  // Prioridad: PORCENTAJE con mayor valor, luego ENVIO_GRATIS
  const porcentaje = activas.filter(p => p.tipo === 'PORCENTAJE').sort((a, b) => b.valor - a.valor)[0]
  const envioGratis = activas.find(p => p.tipo === 'ENVIO_GRATIS')

  // Aplica la mejor combinación: si hay porcentaje, descuenta del subtotal
  let descuentoMonto = 0
  let promoAplicada = null

  if (porcentaje) {
    descuentoMonto = parseFloat(((subtotalUSD * porcentaje.valor) / 100).toFixed(2))
    promoAplicada = porcentaje
  } else if (envioGratis) {
    // Envío gratis: aplicamos un descuento simbólico fijo de $1.50 (costo de envío)
    descuentoMonto = 1.50
    promoAplicada = envioGratis
  }

  const total = Math.max(0, subtotalUSD - descuentoMonto)
  return { subtotal: subtotalUSD, descuentoMonto, total, promoAplicada }
}

// ─── Componente ───────────────────────────────────────────────────────────────

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

  // Promociones activas del restaurante
  const [promociones, setPromociones] = useState([])

  // Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', cardName: '', expiryDate: '', cvv: '', cupon: '' })
  const [processingPayment, setProcessingPayment] = useState(false)

  // Moneda
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [convertedPrices, setConvertedPrices] = useState({})
  const [convertingLoading, setConvertingLoading] = useState(false)
  const [convertingError, setConvertingError] = useState('')

  // Entrega
  const [deliveryForm, setDeliveryForm] = useState({
    direccion_entrega: '', latitud: 14.6349, longitud: -90.5069,
    cliente_telefono: user?.telefono || ''
  })

  useEffect(() => {
    loadRestaurantData()
    fetchProducts()
    loadPromociones()
  }, [restaurantId])

  useEffect(() => {
    if (selectedCurrency !== 'USD' && products.length > 0) convertAllPrices()
    else setConvertedPrices({})
  }, [selectedCurrency, products])

  const loadRestaurantData = () => {
    const saved = localStorage.getItem('currentRestaurant')
    if (saved) setRestaurant(JSON.parse(saved))
  }

  // Carga las promos guardadas por el ClienteDashboard (evita refetch)
  const loadPromociones = () => {
    try {
      const stored = localStorage.getItem(`promos_${restaurantId}`)
      if (stored) setPromociones(JSON.parse(stored))
    } catch { /* noop */ }
  }

  const convertAllPrices = async () => {
    try {
      setConvertingLoading(true); setConvertingError('')
      const uniquePrices = [...new Set(products.map(p => p.precio))]
      const map = {}
      for (const price of uniquePrices) {
        try {
          const result = await convertService.convertCurrency(price, 'USD', selectedCurrency)
          map[price] = result.amount_to || result.converted_amount
        } catch { map[price] = price }
      }
      setConvertedPrices(map)
    } catch { setConvertingError('Error al convertir precios') }
    finally { setConvertingLoading(false) }
  }

  const getDisplayPrice = (priceUSD) => {
    if (selectedCurrency === 'USD') return `$${priceUSD.toFixed(2)}`
    if (convertedPrices[priceUSD]) return `${convertedPrices[priceUSD].toFixed(2)} ${selectedCurrency}`
    return `$${priceUSD.toFixed(2)}`
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/restaurants/${restaurantId}/products`)
      setProducts(response.data.products || [])
      setError('')
    } catch { setError('Error al cargar el menú') }
    finally { setLoading(false) }
  }

  const handleLogout = () => { authService.logout(); navigate('/login') }
  const handleBack = () => navigate('/cliente/dashboard')

  // Carrito
  const addToCart = (product) => {
    const existing = cart.find(i => i.producto_id === product.id)
    if (existing) {
      setCart(cart.map(i => i.producto_id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setCart([...cart, { producto_id: product.id, nombre: product.nombre, precio: product.precio, cantidad: 1, comentarios: '' }])
    }
    setShowCart(true)
  }
  const removeFromCart = (id) => setCart(cart.filter(i => i.producto_id !== id))
  const updateQuantity = (id, qty) => qty === 0 ? removeFromCart(id) : setCart(cart.map(i => i.producto_id === id ? { ...i, cantidad: qty } : i))
  const updateComments = (id, comentarios) => setCart(cart.map(i => i.producto_id === id ? { ...i, comentarios } : i))

  // Totales con promo
  const subtotalUSD = cart.reduce((t, i) => t + i.precio * i.cantidad, 0)
  const { subtotal, descuentoMonto, total, promoAplicada } = calcularTotalConPromo(subtotalUSD, promociones)

  const getDisplayTotal = () => getDisplayPrice(total)
  const getDisplaySubtotal = () => getDisplayPrice(subtotal)
  const getDisplayDescuento = () => getDisplayPrice(descuentoMonto)

  // Crear orden
  const handleCreateOrder = async () => {
    if (!deliveryForm.direccion_entrega.trim()) { alert('Por favor ingresa una dirección de entrega'); return }
    if (cart.length === 0) { alert('El carrito está vacío'); return }

    setOrderLoading(true); setError('')
    try {
      const orderData = {
        restaurante_id: parseInt(restaurantId),
        direccion_entrega: deliveryForm.direccion_entrega,
        latitud: deliveryForm.latitud, longitud: deliveryForm.longitud,
        items: cart.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, comentarios: i.comentarios || '' })),
        cliente_nombre: user?.name || 'Cliente',
        cliente_telefono: deliveryForm.cliente_telefono,
        nombre_restaurante: restaurant?.nombre || '',
        monto_descuento: descuentoMonto,
      }
      const response = await orderService.createOrder(orderData)
      setCreatedOrderId(response.order_id)
      setShowCart(false)
      setShowPaymentModal(true)
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al crear la orden'
      setError(msg); alert('Error: ' + msg)
    } finally {
      setOrderLoading(false)
    }
  }

  // Procesar pago
  const handleProcessPayment = async (e) => {
    e.preventDefault()
    if (!paymentForm.cardNumber || paymentForm.cardNumber.replace(/\s/g,'').length < 16) { alert('Número de tarjeta inválido'); return }
    if (!paymentForm.cardName.trim()) { alert('Nombre en la tarjeta requerido'); return }
    if (!paymentForm.expiryDate || paymentForm.expiryDate.length < 5) { alert('Fecha de expiración inválida'); return }
    if (!paymentForm.cvv || paymentForm.cvv.length < 3) { alert('CVV inválido'); return }

    setProcessingPayment(true); setError('')
    try {
      const paymentData = {
        order_id: createdOrderId,
        payment_method: 'TARJETA',
        use_cupon: paymentForm.cupon.trim() !== '',
        amount: total, // total ya con descuento aplicado
      }

      const response = await api.post('/api/payments', paymentData)
      const promoMsg = promoAplicada
        ? `\n\n✨ Descuento aplicado: ${promoAplicada.tipo === 'PORCENTAJE' ? `${promoAplicada.valor}% (−$${descuentoMonto.toFixed(2)})` : 'Envío gratis (−$1.50)'}`
        : ''
      alert(`¡Pago procesado exitosamente!${promoMsg}\n\nPago ID: ${response.data.payment_id}\nEstado: ${response.data.status}\n\n${response.data.message}`)
      setShowPaymentModal(false); setCreatedOrderId(null); setCart([])
      setPaymentForm({ cardNumber:'', cardName:'', expiryDate:'', cvv:'', cupon:'' })
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al procesar el pago'
      setError(msg); alert('Error en el pago: ' + msg)
    } finally {
      setProcessingPayment(false)
    }
  }

  // Formatters
  const formatCardNumber = (v) => {
    const n = v.replace(/\s+/g,'').replace(/[^0-9]/gi,'')
    const m = n.match(/\d{4,16}/g)
    const match = (m && m[0]) || ''
    const parts = []
    for (let i = 0; i < match.length; i += 4) parts.push(match.substring(i, i+4))
    return parts.length ? parts.join(' ') : v
  }
  const formatExpiry = (v) => {
    const n = v.replace(/\s+/g,'').replace(/[^0-9]/gi,'')
    return n.length >= 2 ? n.slice(0,2) + '/' + n.slice(2,4) : n
  }

  const productsByCategory = products.reduce((acc, p) => {
    const cat = p.categoria || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand"><div className="logo-icon">🚀</div><div className="logo-text">DeliveryApp</div></div>
        <div className="nav-user">
          <div className="user-info"><span className="user-name">{user?.name}</span><span className="user-role">Cliente</span></div>
          <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <button onClick={handleBack} className="btn-back">← Volver a Restaurantes</button>
          {cart.length > 0 && (
            <button onClick={() => setShowCart(!showCart)} className="btn-cart">
              🛒 Carrito ({cart.length})
            </button>
          )}
        </div>

        {restaurant && (
          <div className="restaurant-header">
            <div className="restaurant-header-info">
              <h1>{restaurant.nombre}</h1>
              <div className="restaurant-meta">
                {restaurant.calificacion && <span>⭐ {restaurant.calificacion.toFixed(1)}</span>}
                {restaurant.direccion && <span>📍 {restaurant.direccion}</span>}
                {restaurant.telefono && <span>📞 {restaurant.telefono}</span>}
                <span>
                  💱
                  <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ marginLeft:'0.5rem', padding:'0.25rem 0.5rem', cursor:'pointer' }}>
                    <option value="USD">USD</option><option value="GTQ">GTQ</option><option value="MXN">MXN</option>
                    <option value="COP">COP</option><option value="PEN">PEN</option><option value="CLP">CLP</option>
                    <option value="ARS">ARS</option><option value="BRL">BRL</option>
                  </select>
                  {convertingLoading && <small style={{ marginLeft:'0.5rem' }}>⏳</small>}
                </span>
              </div>
            </div>

            {/* Banner de promociones activas */}
            {promociones.filter(isVigente).length > 0 && (
              <div style={{ marginTop:'12px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
                {promociones.filter(isVigente).map(p => (
                  <div key={p.id} style={{ display:'inline-flex', alignItems:'center', gap:'6px', background: p.tipo === 'ENVIO_GRATIS' ? 'linear-gradient(135deg,#1565c0,#0d47a1)' : 'linear-gradient(135deg,#e65100,#ff6b35)', color:'#fff', padding:'6px 14px', borderRadius:'20px', fontSize:'0.82rem', fontWeight:700, boxShadow:'0 2px 10px rgba(0,0,0,0.2)' }}>
                    {p.tipo === 'ENVIO_GRATIS' ? '🚚' : '🏷️'}
                    {p.titulo}
                    {p.tipo === 'PORCENTAJE' && ` — ${p.valor}% OFF`}
                  </div>
                ))}
              </div>
            )}
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
                  <input type="text" placeholder="Comentarios (opcional)" value={item.comentarios} onChange={e => updateComments(item.producto_id, e.target.value)} className="cart-item-comments" />
                  <button onClick={() => removeFromCart(item.producto_id)} className="btn-remove">Eliminar</button>
                </div>
              ))}
            </div>

            <div className="cart-delivery">
              <h4>Información de Entrega</h4>
              <div className="form-group">
                <label>Dirección de entrega *</label>
                <input type="text" placeholder="Ej: Mi casa zona 12" value={deliveryForm.direccion_entrega} onChange={e => setDeliveryForm({...deliveryForm, direccion_entrega: e.target.value})} className="form-input" />
              </div>
              <div className="form-group">
                <label>Teléfono de contacto</label>
                <input type="tel" placeholder="+505 5505550" value={deliveryForm.cliente_telefono} onChange={e => setDeliveryForm({...deliveryForm, cliente_telefono: e.target.value})} className="form-input" />
              </div>
            </div>

            {/* Resumen de precios con descuento */}
            <div className="cart-total">
              {promoAplicada ? (
                <div style={{ padding:'12px', background:'rgba(255,107,53,0.06)', borderRadius:'10px', border:'1px solid rgba(255,107,53,0.2)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.88rem', color:'#888', marginBottom:'4px' }}>
                    <span>Subtotal:</span><span>{getDisplaySubtotal()}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.88rem', color:'#4caf50', marginBottom:'8px' }}>
                    <span>
                      {promoAplicada.tipo === 'PORCENTAJE' ? `🏷️ ${promoAplicada.valor}% OFF` : '🚚 Envío gratis'}
                      <span style={{ fontSize:'0.75rem', marginLeft:'4px', color:'#888' }}>({promoAplicada.titulo})</span>
                    </span>
                    <span>−{getDisplayDescuento()}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:'1.1rem' }}>
                    <span>Total:</span><span style={{ color:'var(--primary)' }}>{getDisplayTotal()}</span>
                  </div>
                </div>
              ) : (
                <h3>Total: {getDisplayTotal()}</h3>
              )}
            </div>

            {error && <div className="alert alert-error" style={{ marginTop:'10px' }}>{error}</div>}

            <button onClick={handleCreateOrder} disabled={orderLoading || cart.length === 0} className="btn-order">
              {orderLoading ? 'Procesando...' : 'Realizar Pedido'}
            </button>
          </div>
        )}

        {/* Menú de productos */}
        <div className="menu-section">
          <h2>Menú</h2>
          {error && !showCart && <div className="alert alert-error" style={{ marginBottom:'20px' }}>{error}</div>}

          {loading ? (
            <div className="loading-state"><div className="spinner-large"></div><p>Cargando menú...</p></div>
          ) : products.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🍽️</div><p>No hay productos disponibles</p><small>Este restaurante aún no tiene productos en su menú</small></div>
          ) : (
            <div className="menu-categories">
              {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category} className="menu-category">
                  <h3 className="category-title">{category}</h3>
                  <div className="products-grid">
                    {categoryProducts.map(product => {
                      // Mostrar precio con descuento si aplica promo de porcentaje
                      const precioConDesc = promoAplicada?.tipo === 'PORCENTAJE'
                        ? product.precio * (1 - promoAplicada.valor / 100)
                        : product.precio
                      const tieneDescuento = promoAplicada?.tipo === 'PORCENTAJE'
                      return (
                        <div key={product.id} className="product-card">
                          <div className="product-info">
                            <h4>{product.nombre}</h4>
                            {product.descripcion && <p className="product-description">{product.descripcion}</p>}
                            <div className="product-footer">
                              <div>
                                {tieneDescuento ? (
                                  <>
                                    <span style={{ textDecoration:'line-through', color:'#888', fontSize:'0.82rem', marginRight:'6px' }}>
                                      {getDisplayPrice(product.precio)}
                                    </span>
                                    <span className="product-price" style={{ color:'#ff6b35' }}>
                                      {getDisplayPrice(precioConDesc)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="product-price">{getDisplayPrice(product.precio)}</span>
                                )}
                              </div>
                              {!product.disponible && <span className="product-unavailable">No disponible</span>}
                            </div>
                          </div>
                          <button className="btn-add-to-cart" disabled={!product.disponible} onClick={() => addToCart(product)}>
                            {product.disponible ? 'Agregar' : 'Agotado'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Pago */}
      {showPaymentModal && (
        <div className="cart-sidebar" style={{ zIndex:1001 }}>
          <div className="cart-header">
            <h3>💳 Procesar Pago</h3>
            <button onClick={() => { if (window.confirm('¿Cancelar el pago? La orden se perderá.')) { setShowPaymentModal(false); setCreatedOrderId(null); setPaymentForm({ cardNumber:'', cardName:'', expiryDate:'', cvv:'', cupon:'' }) } }} className="btn-close">✕</button>
          </div>

          <form onSubmit={handleProcessPayment} style={{ padding:'20px' }}>
            {/* Confirmación de orden */}
            <div style={{ background:'rgba(76,175,80,0.1)', border:'1px solid rgba(76,175,80,0.3)', borderRadius:'10px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
              <div style={{ fontSize:'14px', color:'#4caf50', marginBottom:'8px' }}>✓ Orden creada exitosamente</div>
              <div style={{ fontSize:'12px', color:'#666' }}>Orden ID: #{createdOrderId}</div>
            </div>

            {/* Resumen de pago con descuento */}
            <div style={{ background:'rgba(33,150,243,0.05)', border:'1px solid rgba(33,150,243,0.2)', borderRadius:'10px', padding:'16px', marginBottom:'20px' }}>
              {promoAplicada ? (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#888', marginBottom:'4px' }}>
                    <span>Subtotal:</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#4caf50', marginBottom:'8px', fontWeight:600 }}>
                    <span>
                      {promoAplicada.tipo === 'PORCENTAJE' ? `🏷️ ${promoAplicada.valor}% OFF` : '🚚 Envío gratis'}
                    </span>
                    <span>−${descuentoMonto.toFixed(2)}</span>
                  </div>
                  <div style={{ background:'rgba(255,107,53,0.08)', borderRadius:'6px', padding:'8px', textAlign:'center', marginBottom:'4px' }}>
                    <div style={{ fontSize:'11px', color:'#ff6b35', marginBottom:'2px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Promoción aplicada: {promoAplicada.titulo}</div>
                  </div>
                  <div style={{ fontSize:'24px', fontWeight:'700', color:'#333', textAlign:'center', marginTop:'8px' }}>
                    Total a Pagar: ${total.toFixed(2)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:'24px', fontWeight:'700', color:'#333', textAlign:'center' }}>
                  Total a Pagar: ${total.toFixed(2)}
                </div>
              )}
            </div>

            <h4 style={{ fontSize:'16px', color:'#333', marginBottom:'16px' }}>Información de Tarjeta</h4>

            <div className="form-group" style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'13px', color:'#666', marginBottom:'6px' }}>Número de Tarjeta *</label>
              <input type="text" value={paymentForm.cardNumber}
                onChange={e => { const f = formatCardNumber(e.target.value); if (f.replace(/\s/g,'').length <= 16) setPaymentForm({...paymentForm, cardNumber: f}) }}
                placeholder="1234 5678 9012 3456" className="form-input"
                style={{ width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'16px', fontFamily:'monospace', letterSpacing:'1px' }} required />
            </div>
            <div className="form-group" style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'13px', color:'#666', marginBottom:'6px' }}>Nombre en la Tarjeta *</label>
              <input type="text" value={paymentForm.cardName}
                onChange={e => setPaymentForm({...paymentForm, cardName: e.target.value.toUpperCase()})}
                placeholder="JUAN PEREZ" className="form-input"
                style={{ width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', textTransform:'uppercase' }} required />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              <div>
                <label style={{ display:'block', fontSize:'13px', color:'#666', marginBottom:'6px' }}>Fecha Exp. *</label>
                <input type="text" value={paymentForm.expiryDate}
                  onChange={e => { const f = formatExpiry(e.target.value); if (f.replace(/\//g,'').length <= 4) setPaymentForm({...paymentForm, expiryDate: f}) }}
                  placeholder="MM/YY"
                  style={{ width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', fontFamily:'monospace' }} required />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'13px', color:'#666', marginBottom:'6px' }}>CVV *</label>
                <input type="password" value={paymentForm.cvv}
                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g,''); if (v.length <= 4) setPaymentForm({...paymentForm, cvv: v}) }}
                  placeholder="123"
                  style={{ width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px' }} maxLength="4" required />
              </div>
            </div>

            <div style={{ borderTop:'1px solid #eee', paddingTop:'16px', marginBottom:'16px' }}>
              <h4 style={{ fontSize:'14px', color:'#333', marginBottom:'12px' }}>¿Tienes un cupón? (Opcional)</h4>
              <input type="text" value={paymentForm.cupon}
                onChange={e => setPaymentForm({...paymentForm, cupon: e.target.value.toUpperCase()})}
                placeholder="CODIGO-DESCUENTO" className="form-input"
                style={{ width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', textTransform:'uppercase' }} />
            </div>

            {error && <div className="alert alert-error" style={{ marginTop:'10px' }}>{error}</div>}

            <div style={{ background:'rgba(255,152,0,0.05)', border:'1px solid rgba(255,152,0,0.2)', borderRadius:'8px', padding:'12px', marginBottom:'16px' }}>
              <div style={{ fontSize:'12px', color:'#666', textAlign:'center' }}>🔒 Pago simulado — No se realizará cargo real</div>
            </div>

            <button type="submit" disabled={processingPayment}
              style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg, #4caf50, #45a049)', border:'none', borderRadius:'12px', color:'white', fontSize:'16px', fontWeight:'600', cursor: processingPayment ? 'not-allowed' : 'pointer', opacity: processingPayment ? 0.6 : 1, transition:'all 0.3s ease' }}>
              {processingPayment ? '💳 Procesando...' : `✓ Confirmar Pago $${total.toFixed(2)}`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default RestaurantMenu
