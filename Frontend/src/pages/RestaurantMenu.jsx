import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authService, cuponService } from '../services/api'
import { orderService } from '../services/orderService'
import { convertService } from '../services/convertService'
import api from '../services/api'
import '../styles/Dashboard.css'

// ─── Helpers de promoción (existente, sin cambios) ────────────────────────────

const isVigente = (p) => p.activa && new Date(p.fecha_fin) >= new Date()

// Devuelve { subtotal, descuentoMonto, total, promoAplicada }
const calcularTotalConPromo = (subtotalUSD, promociones) => {
  const activas = (promociones || []).filter(isVigente)
  if (activas.length === 0) return { subtotal: subtotalUSD, descuentoMonto: 0, total: subtotalUSD, promoAplicada: null }

  const porcentaje = activas.filter(p => p.tipo === 'PORCENTAJE').sort((a, b) => b.valor - a.valor)[0]
  const envioGratis = activas.find(p => p.tipo === 'ENVIO_GRATIS')

  let descuentoMonto = 0
  let promoAplicada = null

  if (porcentaje) {
    descuentoMonto = parseFloat(((subtotalUSD * porcentaje.valor) / 100).toFixed(2))
    promoAplicada = porcentaje
  } else if (envioGratis) {
    descuentoMonto = 1.50
    promoAplicada = envioGratis
  }

  const total = Math.max(0, subtotalUSD - descuentoMonto)
  return { subtotal: subtotalUSD, descuentoMonto, total, promoAplicada }
}

// ─── Helper: validar cupón en frontend ───────────────────────────────────────
// Devuelve { valido, cupon, error }
const validarCupon = (codigo, cuponesList, subtotal) => {
  if (!codigo.trim()) return { valido: false, cupon: null, error: 'Ingresa un código de cupón' }

  const cupon = cuponesList.find(c => c.codigo.toUpperCase() === codigo.toUpperCase())

  if (cupon === undefined) {
    return { valido: false, cupon: null, error: 'Cupón no encontrado para este restaurante' }
  }
  if (!cupon.autorizado)
    return { valido: false, cupon: null, error: 'Este cupón aún no ha sido autorizado' }
  if (!cupon.activo)
    return { valido: false, cupon: null, error: 'Este cupón no está activo' }

  const ahora = new Date()
  if (new Date(cupon.fecha_inicio) > ahora)
    return { valido: false, cupon: null, error: 'Este cupón aún no está vigente' }
  if (new Date(cupon.fecha_expiracion) < ahora) {
    verificarExpiracionCupon(cupon.id) // Verificar expiración en backend para actualizar estado
    return {
      valido: false, cupon: null, error: 'Este cupón ha expirado'
    }
  }
  if (cupon.usos_actuales >= cupon.uso_maximo)
    return { valido: false, cupon: null, error: 'Este cupón ha alcanzado su límite de usos' }

  return { valido: true, cupon, error: '' }
}

// Calcula el monto de descuento del cupón sobre el subtotal (ya con promo aplicada si hay)
const calcularDescuentoCupon = (cupon, montoBase) => {
  if (!cupon || cupon.valor <= 0) return 0
  // El valor siempre es porcentaje según spec
  const descuento = parseFloat(((montoBase * cupon.valor) / 100).toFixed(2))
  return Math.abs(descuento) // valor absoluto, nunca negativo
}

// Actualizar el numero de usos del cupón en backend
const actualizarUsoCupon = async (cuponId) => {
  try {
    await cuponService.incrementUso(cuponId)
  } catch (e) {
    console.error('Error actualizando uso del cupón:', e)
  }
}

// Verificar expiración del cupón
const verificarExpiracionCupon = async (cuponId) => {
  try {
    const response = await cuponService.verificarExpiracion(cuponId)
    console.log('Verificación de expiración del cupón:', response)
    //return response.data // { expirado: true/false }
  } catch (e) {
    console.error('Error verificando expiración del cupón:', e)
    //return { expirado: false }
  }
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

  // Promociones activas del restaurante (existente)
  const [promociones, setPromociones] = useState([])

  // ── Cupones ────────────────────────────────────────────────────────────────
  const [cuponesList, setCuponesList] = useState([])         // todos los cupones del restaurante
  const [codigoCupon, setCodigoCupon] = useState('')         // input del usuario
  const [cuponAplicado, setCuponAplicado] = useState(null)   // cupón validado y aplicado
  const [cuponMsg, setCuponMsg] = useState({ tipo: '', texto: '' }) // feedback visual
  const [validandoCupon, setValidandoCupon] = useState(false)

  // Secciones colapsables del footer del carrito
  const [showDelivery, setShowDelivery] = useState(true)
  const [showCuponSection, setShowCuponSection] = useState(false)

  // Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', cardName: '', expiryDate: '', cvv: '' })
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
    fetchCuponesRestaurante()
  }, [restaurantId])

  useEffect(() => {
    if (selectedCurrency !== 'USD' && products.length > 0) convertAllPrices()
    else setConvertedPrices({})
  }, [selectedCurrency, products])

  // Si cambia el carrito y hay cupón aplicado, recalcular (por si queda en negativo)
  useEffect(() => {
    if (cuponAplicado) {
      // Re-validar por si el subtotal bajó a 0
      const { valido } = validarCupon(cuponAplicado.codigo, cuponesList, subtotalUSD)
      if (!valido) quitarCupon()
    }
  }, [cart])

  const loadRestaurantData = () => {
    const saved = localStorage.getItem('currentRestaurant')
    if (saved) setRestaurant(JSON.parse(saved))
  }

  const loadPromociones = () => {
    try {
      const stored = localStorage.getItem(`promos_${restaurantId}`)
      if (stored) setPromociones(JSON.parse(stored))
    } catch { /* noop */ }
  }

  // Carga todos los cupones autorizados y activos del restaurante para validación local
  const fetchCuponesRestaurante = async () => {
    try {
      const result = await cuponService.getAll({
        restaurante_id: restaurantId,
        solo_activos: true,
        solo_autorizados: true,
      })
      setCuponesList(result.cupones || [])
    } catch {
      // Silencioso — si falla simplemente no hay cupones disponibles
    }
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

  // ── Carrito ────────────────────────────────────────────────────────────────
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

  // ── Cálculo de totales ─────────────────────────────────────────────────────
  const subtotalUSD = cart.reduce((t, i) => t + i.precio * i.cantidad, 0)

  // 1. Aplica promo automática (existente)
  const { subtotal, descuentoMonto: descuentoPromo, total: totalConPromo, promoAplicada } = calcularTotalConPromo(subtotalUSD, promociones)

  // 2. Aplica cupón manual encima del total ya descontado por promo
  const descuentoCupon = cuponAplicado ? calcularDescuentoCupon(cuponAplicado, totalConPromo) : 0

  // Total final = total con promo − descuento cupón (nunca negativo)
  const totalFinal = Math.max(0, totalConPromo - descuentoCupon)

  // monto_descuento que va a la orden: suma de ambos descuentos, nunca negativo
  const montoDescuentoOrden = Math.abs(descuentoPromo + descuentoCupon)

  const getDisplayTotal = () => getDisplayPrice(totalFinal)
  const getDisplaySubtotal = () => getDisplayPrice(subtotal)
  const getDisplayDescuento = () => getDisplayPrice(descuentoPromo)
  const getDisplayDescuentoCupon = () => getDisplayPrice(descuentoCupon)

  // ── Cupón: aplicar y quitar ────────────────────────────────────────────────
  const handleAplicarCupon = async () => {
    if (!codigoCupon.trim()) {
      setCuponMsg({ tipo: 'error', texto: 'Ingresa un código de cupón' })
      return
    }
    if (cart.length === 0) {
      setCuponMsg({ tipo: 'error', texto: 'Agrega productos al carrito primero' })
      return
    }

    setValidandoCupon(true)
    setCuponMsg({ tipo: '', texto: '' })

    // Si la lista está vacía intentamos recargar (por si falló al inicio)
    let lista = cuponesList
    if (lista.length === 0) {
      try {
        const result = await cuponService.getAll({
          restaurante_id: restaurantId,
          solo_activos: true,
          solo_autorizados: true,
        })
        lista = result.cupones || []
        setCuponesList(lista)
      } catch {
        setCuponMsg({ tipo: 'error', texto: 'No se pudo verificar el cupón. Intenta de nuevo.' })
        setValidandoCupon(false)
        return
      }
    }

    const { valido, cupon, error: cuponError } = validarCupon(codigoCupon, lista, subtotalUSD)

    if (!valido) {
      setCuponMsg({ tipo: 'error', texto: cuponError })
      setValidandoCupon(false)
      return
    }

    const descuento = calcularDescuentoCupon(cupon, totalConPromo)
    setCuponAplicado(cupon)
    setCuponMsg({
      tipo: 'exito',
      texto: `✓ Cupón aplicado — ${cupon.valor}% de descuento (−$${descuento.toFixed(2)})`,
    })
    setValidandoCupon(false)
  }

  const quitarCupon = () => {
    setCuponAplicado(null)
    setCodigoCupon('')
    setCuponMsg({ tipo: '', texto: '' })
  }

  // ── Crear orden ────────────────────────────────────────────────────────────
  const handleCreateOrder = async () => {
    if (!deliveryForm.direccion_entrega.trim()) { alert('Por favor ingresa una dirección de entrega'); return }
    if (cart.length === 0) { alert('El carrito está vacío'); return }

    setOrderLoading(true); setError('')
    try {
      // monto_descuento: valor absoluto de la suma de descuentos; si es negativo o 0 → 0
      const montoDescuentoFinal = montoDescuentoOrden > 0 ? montoDescuentoOrden : 0

      const orderData = {
        restaurante_id: parseInt(restaurantId),
        direccion_entrega: deliveryForm.direccion_entrega,
        latitud: deliveryForm.latitud,
        longitud: deliveryForm.longitud,
        items: cart.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, comentarios: i.comentarios || '' })),
        cliente_nombre: user?.name || 'Cliente',
        cliente_telefono: deliveryForm.cliente_telefono,
        nombre_restaurante: restaurant?.nombre || '',
        monto_descuento: montoDescuentoFinal,
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

  // ── Procesar pago ──────────────────────────────────────────────────────────
  const handleProcessPayment = async (e) => {
    e.preventDefault()
    if (!paymentForm.cardNumber || paymentForm.cardNumber.replace(/\s/g, '').length < 16) { alert('Número de tarjeta inválido'); return }
    if (!paymentForm.cardName.trim()) { alert('Nombre en la tarjeta requerido'); return }
    if (!paymentForm.expiryDate || paymentForm.expiryDate.length < 5) { alert('Fecha de expiración inválida'); return }
    if (!paymentForm.cvv || paymentForm.cvv.length < 3) { alert('CVV inválido'); return }

    setProcessingPayment(true); setError('')
    try {
      // amount: total ya con ambos descuentos aplicados, nunca negativo
      const amountFinal = Math.max(0, totalFinal)

      const paymentData = {
        order_id: createdOrderId,
        payment_method: 'TARJETA',
        use_cupon: cuponAplicado ? true : false,  // bool como int: 1 si usó cupón
        amount: amountFinal,
      }

      const response = await api.post('/api/payments', paymentData)

      // Mensaje de confirmación con desglose de descuentos
      let descuentoMsg = ''
      if (promoAplicada) {
        descuentoMsg += `\n  • Promo "${promoAplicada.titulo}": ${promoAplicada.tipo === 'PORCENTAJE' ? `${promoAplicada.valor}% (−$${descuentoPromo.toFixed(2)})` : `Envío gratis (−$${descuentoPromo.toFixed(2)})`}`
      }
      if (cuponAplicado) {
        descuentoMsg += `\n  • Cupón "${cuponAplicado.codigo}": ${cuponAplicado.valor}% (−$${descuentoCupon.toFixed(2)})`
      }
      const promoMsg = descuentoMsg ? `\n\n✨ Descuentos aplicados:${descuentoMsg}` : ''

      // Actualizar uso del cupón en backend si se aplicó
      if (cuponAplicado) await actualizarUsoCupon(cuponAplicado.id)

      alert(`¡Pago procesado exitosamente!${promoMsg}\n\nPago ID: ${response.data.payment_id}\nEstado: ${response.data.status}\n\n${response.data.message}`)

      // Reset completo
      setShowPaymentModal(false)
      setCreatedOrderId(null)
      setCart([])
      setPaymentForm({ cardNumber: '', cardName: '', expiryDate: '', cvv: '' })
      setCuponAplicado(null)
      setCodigoCupon('')
      setCuponMsg({ tipo: '', texto: '' })
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al procesar el pago'
      setError(msg); alert('Error en el pago: ' + msg)
    } finally {
      setProcessingPayment(false)
    }
  }

  // Formatters
  const formatCardNumber = (v) => {
    const n = v.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const m = n.match(/\d{4,16}/g)
    const match = (m && m[0]) || ''
    const parts = []
    for (let i = 0; i < match.length; i += 4) parts.push(match.substring(i, i + 4))
    return parts.length ? parts.join(' ') : v
  }

  const formatExpiry = (v) => {
    const n = v.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    return n.length >= 2 ? n.slice(0, 2) + '/' + n.slice(2, 4) : n
  }

  const productsByCategory = products.reduce((acc, p) => {
    const cat = p.categoria || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  // ── JSX ────────────────────────────────────────────────────────────────────
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                  <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                    <option value="USD">USD</option><option value="GTQ">GTQ</option><option value="MXN">MXN</option>
                    <option value="COP">COP</option><option value="PEN">PEN</option><option value="CLP">CLP</option>
                    <option value="ARS">ARS</option><option value="BRL">BRL</option>
                  </select>
                  {convertingLoading && <small style={{ marginLeft: '0.5rem' }}>⏳</small>}
                </span>
              </div>
            </div>

            {/* Banner de promociones activas */}
            {promociones.filter(isVigente).length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {promociones.filter(isVigente).map(p => (
                  <div key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: p.tipo === 'ENVIO_GRATIS' ? 'linear-gradient(135deg,#1565c0,#0d47a1)' : 'linear-gradient(135deg,#e65100,#ff6b35)', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                    {p.tipo === 'ENVIO_GRATIS' ? '🚚' : '🏷️'}
                    {p.titulo}
                    {p.tipo === 'PORCENTAJE' && ` — ${p.valor}% OFF`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Carrito lateral ── */}
        {showCart && cart.length > 0 && (
          <div className="cart-sidebar">

            {/* ── HEADER fijo ── */}
            <div className="cart-header" style={{ flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0 }}>Tu Pedido</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {cart.reduce((t, i) => t + i.cantidad, 0)} {cart.reduce((t, i) => t + i.cantidad, 0) === 1 ? 'producto' : 'productos'}
                </span>
              </div>
              <button onClick={() => setShowCart(false)} className="btn-close">✕</button>
            </div>

            {/* ── ZONA SCROLLEABLE: solo los productos ── */}
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.producto_id} className="cart-item">
                  {/* Fila superior: nombre + total de línea */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.nombre}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{getDisplayPrice(item.precio)} c/u</div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)', flexShrink: 0 }}>
                      {getDisplayPrice(item.precio * item.cantidad)}
                    </span>
                  </div>
                  {/* Fila inferior: cantidad + comentario + eliminar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}
                        style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>−</button>
                      <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{item.cantidad}</span>
                      <button onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}
                        style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>+</button>
                    </div>
                    <input type="text" placeholder="Comentario…" value={item.comentarios}
                      onChange={e => updateComments(item.producto_id, e.target.value)}
                      style={{ flex: 1, padding: '5px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
                    <button onClick={() => removeFromCart(item.producto_id)} title="Eliminar"
                      style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--error)', background: 'rgba(239,68,68,0.08)', color: 'var(--error)', fontSize: '13px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── FOOTER fijo: entrega + cupón + resumen + botón ── */}
            <div style={{ flexShrink: 0, borderTop: '2px solid var(--border)', background: 'var(--bg-card)' }}>

              {/* Entrega colapsable */}
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowDelivery(v => !v)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
                  <span>
                    📍 Entrega
                    {deliveryForm.direccion_entrega.trim() && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                        {deliveryForm.direccion_entrega.length > 22 ? deliveryForm.direccion_entrega.slice(0, 22) + '…' : deliveryForm.direccion_entrega}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', transition: 'transform 0.2s', display: 'inline-block', transform: showDelivery ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>
                {showDelivery && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dirección *</label>
                      <input type="text" placeholder="Ej: Mi casa zona 12" value={deliveryForm.direccion_entrega}
                        onChange={e => setDeliveryForm({ ...deliveryForm, direccion_entrega: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Teléfono</label>
                      <input type="tel" placeholder="+505 5505550" value={deliveryForm.cliente_telefono}
                        onChange={e => setDeliveryForm({ ...deliveryForm, cliente_telefono: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Cupón colapsable */}
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowCuponSection(v => !v)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
                  <span>
                    🎟️ Cupón
                    {cuponAplicado && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', background: '#e8f5e9', color: '#2e7d32', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
                        {cuponAplicado.codigo} — {cuponAplicado.valor}% OFF
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', transition: 'transform 0.2s', display: 'inline-block', transform: showCuponSection ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>
                {showCuponSection && (
                  <div style={{ padding: '0 16px 12px' }}>
                    {!cuponAplicado ? (
                      <>
                        <div style={{ display: 'flex', gap: '7px' }}>
                          <input type="text" value={codigoCupon}
                            onChange={e => { setCodigoCupon(e.target.value.toUpperCase()); setCuponMsg({ tipo: '', texto: '' }) }}
                            onKeyDown={e => e.key === 'Enter' && handleAplicarCupon()}
                            placeholder="CODIGO-CUPON" disabled={validandoCupon}
                            style={{ flex: 1, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }} />
                          <button type="button" onClick={handleAplicarCupon} disabled={validandoCupon || !codigoCupon.trim()}
                            style={{
                              padding: '8px 13px', borderRadius: '7px', border: 'none', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap',
                              cursor: validandoCupon || !codigoCupon.trim() ? 'not-allowed' : 'pointer',
                              background: validandoCupon || !codigoCupon.trim() ? '#e0e0e0' : 'linear-gradient(135deg,#ff6b35,#e65100)',
                              color: validandoCupon || !codigoCupon.trim() ? '#999' : '#fff'
                            }}>
                            {validandoCupon ? '⏳' : 'Aplicar'}
                          </button>
                        </div>
                        {cuponMsg.texto && (
                          <div style={{
                            marginTop: '6px', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                            background: cuponMsg.tipo === 'exito' ? '#e8f5e9' : '#fce4e4',
                            color: cuponMsg.tipo === 'exito' ? '#2e7d32' : '#c62828',
                            border: `1px solid ${cuponMsg.tipo === 'exito' ? '#a5d6a7' : '#ef9a9a'}`
                          }}>
                            {cuponMsg.texto}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '7px' }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#2e7d32' }}>{cuponAplicado.codigo}</span>
                          <span style={{ marginLeft: '7px', fontSize: '12px', color: '#388e3c' }}>{cuponAplicado.valor}% OFF — −{getDisplayDescuentoCupon()}</span>
                          {cuponAplicado.titulo && <div style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>{cuponAplicado.titulo}</div>}
                        </div>
                        <button type="button" onClick={quitarCupon} title="Quitar cupón"
                          style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: '16px', padding: '0 3px' }}>✕</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resumen de precios + botón */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ background: 'rgba(255,107,53,0.06)', borderRadius: '10px', border: '1px solid rgba(255,107,53,0.15)', padding: '10px 12px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '3px' }}>
                    <span>Subtotal</span><span>{getDisplaySubtotal()}</span>
                  </div>
                  {promoAplicada && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4caf50', marginBottom: '3px' }}>
                      <span>{promoAplicada.tipo === 'PORCENTAJE' ? `🏷️ ${promoAplicada.valor}% OFF` : '🚚 Envío gratis'}
                        <span style={{ fontSize: '11px', marginLeft: '4px', color: '#888' }}>({promoAplicada.titulo})</span></span>
                      <span>−{getDisplayDescuento()}</span>
                    </div>
                  )}
                  {cuponAplicado && descuentoCupon > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#2e7d32', marginBottom: '3px', fontWeight: 600 }}>
                      <span>🎟️ {cuponAplicado.codigo} ({cuponAplicado.valor}%)</span>
                      <span>−{getDisplayDescuentoCupon()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(255,107,53,0.3)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Total</span>
                    <span style={{ color: 'var(--primary)' }}>{getDisplayTotal()}</span>
                  </div>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '8px', fontSize: '12px' }}>{error}</div>}

                <button onClick={handleCreateOrder} disabled={orderLoading || cart.length === 0} className="btn-order"
                  style={{ width: '100%', margin: 0, padding: '13px' }}>
                  {orderLoading ? 'Procesando...' : `Realizar Pedido — ${getDisplayTotal()}`}
                </button>
                {!deliveryForm.direccion_entrega.trim() && (
                  <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', margin: '5px 0 0' }}>
                    ↑ Abre "Entrega" e ingresa tu dirección para continuar
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Menú de productos */}
        <div className="menu-section">
          <h2>Menú</h2>
          {error && !showCart && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

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
                                    <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.82rem', marginRight: '6px' }}>
                                      {getDisplayPrice(product.precio)}
                                    </span>
                                    <span className="product-price" style={{ color: '#ff6b35' }}>
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

      {/* ── Modal de Pago ── */}
      {showPaymentModal && (
        <div className="cart-sidebar" style={{ zIndex: 1001 }}>
          <div className="cart-header">
            <h3>💳 Procesar Pago</h3>
            <button onClick={() => {
              if (window.confirm('¿Cancelar el pago? La orden se perderá.')) {
                setShowPaymentModal(false)
                setCreatedOrderId(null)
                setPaymentForm({ cardNumber: '', cardName: '', expiryDate: '', cvv: '' })
              }
            }} className="btn-close">✕</button>
          </div>

          <div className='scrollpago'>
            <form onSubmit={handleProcessPayment} style={{ padding: '20px' }}>
              {/* Confirmación de orden */}
              <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#4caf50', marginBottom: '8px' }}>✓ Orden creada exitosamente</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Orden ID: #{createdOrderId}</div>
              </div>

              {/* Resumen de pago con desglose completo */}
              <div style={{ background: 'rgba(33,150,243,0.05)', border: '1px solid rgba(33,150,243,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                {/* Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '4px' }}>
                  <span>Subtotal:</span><span>${subtotal.toFixed(2)}</span>
                </div>

                {/* Descuento promo automática */}
                {promoAplicada && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4caf50', marginBottom: '4px', fontWeight: 600 }}>
                    <span>{promoAplicada.tipo === 'PORCENTAJE' ? `🏷️ Promo ${promoAplicada.valor}% OFF` : '🚚 Envío gratis'}</span>
                    <span>−${descuentoPromo.toFixed(2)}</span>
                  </div>
                )}

                {/* Descuento cupón */}
                {cuponAplicado && descuentoCupon > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#2e7d32', marginBottom: '4px', fontWeight: 600 }}>
                    <span>🎟️ Cupón {cuponAplicado.codigo} ({cuponAplicado.valor}%)</span>
                    <span>−${descuentoCupon.toFixed(2)}</span>
                  </div>
                )}

                {/* Etiqueta de descuentos aplicados */}
                {(promoAplicada || cuponAplicado) && (
                  <div style={{ background: 'rgba(255,107,53,0.08)', borderRadius: '6px', padding: '6px 10px', marginBottom: '6px', fontSize: '11px', color: '#ff6b35', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {[promoAplicada && promoAplicada.titulo, cuponAplicado && `Cupón ${cuponAplicado.codigo}`].filter(Boolean).join(' + ')}
                  </div>
                )}

                {/* Total final */}
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#333', textAlign: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                  Total a Pagar: ${totalFinal.toFixed(2)}
                </div>
              </div>

              <h4 style={{ fontSize: '16px', color: '#333', marginBottom: '16px' }}>Información de Tarjeta</h4>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Número de Tarjeta *</label>
                <input type="text" value={paymentForm.cardNumber}
                  onChange={e => { const f = formatCardNumber(e.target.value); if (f.replace(/\s/g, '').length <= 16) setPaymentForm({ ...paymentForm, cardNumber: f }) }}
                  placeholder="1234 5678 9012 3456" className="form-input"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', fontFamily: 'monospace', letterSpacing: '1px' }} required />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Nombre en la Tarjeta *</label>
                <input type="text" value={paymentForm.cardName}
                  onChange={e => setPaymentForm({ ...paymentForm, cardName: e.target.value.toUpperCase() })}
                  placeholder="JUAN PEREZ" className="form-input"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', textTransform: 'uppercase' }} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Fecha Exp. *</label>
                  <input type="text" value={paymentForm.expiryDate}
                    onChange={e => { const f = formatExpiry(e.target.value); if (f.replace(/\//g, '').length <= 4) setPaymentForm({ ...paymentForm, expiryDate: f }) }}
                    placeholder="MM/YY"
                    style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>CVV *</label>
                  <input type="password" value={paymentForm.cvv}
                    onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); if (v.length <= 4) setPaymentForm({ ...paymentForm, cvv: v }) }}
                    placeholder="123"
                    style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} maxLength="4" required />
                </div>
              </div>

              {/* Cupón aplicado (solo lectura en modal de pago) */}
              {cuponAplicado ? (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🎟️</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#2e7d32' }}>{cuponAplicado.codigo}</span>
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#388e3c' }}>{cuponAplicado.valor}% OFF aplicado</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '14px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center' }}>
                    Para aplicar un cupón, cierra este modal y agrégalo en el carrito.
                  </p>
                </div>
              )}

              {error && <div className="alert alert-error" style={{ marginTop: '10px' }}>{error}</div>}

              <div style={{ background: 'rgba(255,152,0,0.05)', border: '1px solid rgba(255,152,0,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>🔒 Pago simulado — No se realizará cargo real</div>
              </div>

              <button type="submit" disabled={processingPayment}
                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #4caf50, #45a049)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '600', cursor: processingPayment ? 'not-allowed' : 'pointer', opacity: processingPayment ? 0.6 : 1, transition: 'all 0.3s ease' }}>
                {processingPayment ? '💳 Procesando...' : `✓ Confirmar Pago $${totalFinal.toFixed(2)}`}
              </button>
            </form>
          </div>
          
        </div>
      )}
    </div>
  )
}

export default RestaurantMenu
