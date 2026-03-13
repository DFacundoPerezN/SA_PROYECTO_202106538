import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, promocionService, cuponService } from '../services/api'
import api from '../services/api'
import styles from '../styles/RestaurantDashboard.module.css'

const toInputDate = (isoStr) => isoStr ? isoStr.slice(0, 10) : ''
const toISODate = (dateStr) => dateStr ? `${dateStr}T00:00:00` : ''
const isPromocionVigente = (p) => {
  if (!p.activa) return false
  return new Date(p.fecha_fin) >= new Date()
}
const TIPO_LABELS = { PORCENTAJE: '% Descuento', ENVIO_GRATIS: 'Envío Gratis' }

const RestaurantDashboard = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('TODAS')

  const [activeTab, setActiveTab] = useState('orders')

  const [products, setProducts] = useState([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [productForm, setProductForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: '' })

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const [restaurantId, setRestaurantId] = useState(null)
  const [restaurantName, setRestaurantName] = useState('')

  // Promociones state
  const [promociones, setPromociones] = useState([])
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [promoFilter, setPromoFilter] = useState('TODAS')

  const emptyPromoForm = {
    titulo: '', descripcion: '', tipo: 'PORCENTAJE', valor: '',
    fecha_inicio: toInputDate(new Date().toISOString()), fecha_fin: '', activa: true,
  }
  const [promoForm, setPromoForm] = useState(emptyPromoForm)

  // ── Cupones state ─────────────────────────────────────────────────────────
  const [cupones, setCupones] = useState([])
  const [cuponLoading, setCuponLoading] = useState(false)
  const [cuponError, setCuponError] = useState('')
  const [cuponSuccess, setCuponSuccess] = useState('')
  const [showCuponModal, setShowCuponModal] = useState(false)
  const [editingCupon, setEditingCupon] = useState(null)
  const [cuponFilter, setCuponFilter] = useState('TODOS')

  const emptyCuponForm = {
    codigo: '', titulo: '', descripcion: '', valor: '',
    uso_maximo: '1',
    fecha_inicio: toInputDate(new Date().toISOString()),
    fecha_expiracion: '', activo: true,
  }
  const [cuponForm, setCuponForm] = useState(emptyCuponForm)

  useEffect(() => { fetchRestaurantId() }, [])
  useEffect(() => { if (restaurantId) fetchOrders() }, [restaurantId])
  useEffect(() => { filterOrders() }, [orders, filter])

  const fetchRestaurantId = async () => {
    try {
      const response = await api.get('/api/restaurants')
      const userRestaurant = response.data.restaurants?.find(r => r.id === user?.id)
      if (user?.id) {
        setRestaurantId(user?.id)
        setRestaurantName(userRestaurant?.nombre || 'Restaurante')
      } else {
        setError('No se encontró restaurante asociado a este usuario')
      }
    } catch (err) {
      setError('Error al obtener información del restaurante')
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/orders/restaurant/${restaurantId}`)
      setOrders(response.data || [])
      setError('')
    } catch (err) {
      setError('Error al cargar las órdenes')
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    setFilteredOrders(filter === 'TODAS' ? orders : orders.filter(o => o.estado === filter))
  }

  const handleLogout = () => { authService.logout(); navigate('/login') }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus })
      fetchOrders()
    } catch (err) {
      alert('Error al actualizar: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) { alert('Por favor ingresa un motivo'); return }
    try {
      await api.post(`/api/orders/${selectedOrder.id}/cancel`, { motivo: cancelReason })
      setShowCancelModal(false); setSelectedOrder(null); setCancelReason(''); fetchOrders()
    } catch (err) {
      alert('Error al cancelar: ' + (err.response?.data?.error || err.message))
    }
  }

  const getStatusClass = (s) => ({ CREADA: styles.statusCreada, ACEPTADA: styles.statusAceptada, EN_PREPARACION: styles.statusEnPreparacion, TERMINADA: styles.statusTerminada, RECHAZADA: styles.statusRechazada, CANCELADA: styles.statusCancelada }[s] || '')
  const getNextStatusLabel = (s) => s === 'ACEPTADA' ? 'Iniciar Preparación' : s === 'EN_PREPARACION' ? 'Marcar como Terminada' : ''

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/restaurants/${restaurantId}/products`)
      setProducts(response.data.products || [])
      setError('')
    } catch (err) {
      setError('Error al cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!productForm.nombre || !productForm.precio || !productForm.categoria) { alert('Completa los campos obligatorios'); return }
    setLoading(true); setError('')
    try {
      await api.post('/api/products', { nombre: productForm.nombre, descripcion: productForm.descripcion, precio: parseFloat(productForm.precio), categoria: productForm.categoria, restaurante_id: restaurantId, restaurante_nombre: restaurantName })
      alert('¡Producto creado!')
      setShowProductModal(false)
      setProductForm({ nombre: '', descripcion: '', precio: '', categoria: '' })
      fetchProducts()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al crear el producto'
      setError(msg); alert('Error: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'products' && products.length === 0) fetchProducts()
    if (tab === 'promociones' && promociones.length === 0) fetchPromociones()
    if (tab === 'cupones' && cupones.length === 0) fetchCupones()
  }

  // ── Promociones ──────────────────────────────────────────────────────────────
  const fetchPromociones = async () => {
    if (!restaurantId) return
    setPromoLoading(true); setPromoError('')
    try {
      const result = await promocionService.getAll({ restaurante_id: restaurantId })
      setPromociones(result.promociones || [])
    } catch (err) {
      setPromoError('Error al cargar las promociones')
    } finally {
      setPromoLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingPromo(null); setPromoForm(emptyPromoForm); setPromoError(''); setPromoSuccess(''); setShowPromoModal(true)
  }

  const openEditModal = (promo) => {
    setEditingPromo(promo)
    setPromoForm({ titulo: promo.titulo, descripcion: promo.descripcion || '', tipo: promo.tipo, valor: String(promo.valor), fecha_inicio: toInputDate(promo.fecha_inicio), fecha_fin: toInputDate(promo.fecha_fin), activa: promo.activa })
    setPromoError(''); setPromoSuccess(''); setShowPromoModal(true)
  }

  const handlePromoSubmit = async (e) => {
    e.preventDefault()
    if (!promoForm.titulo || !promoForm.fecha_fin) { setPromoError('Título y fecha fin son obligatorios'); return }
    if (promoForm.tipo === 'PORCENTAJE' && (parseFloat(promoForm.valor) <= 0 || parseFloat(promoForm.valor) > 100)) { setPromoError('El porcentaje debe estar entre 1 y 100'); return }
    setPromoLoading(true); setPromoError('')
    try {
      const payload = { titulo: promoForm.titulo, descripcion: promoForm.descripcion, tipo: promoForm.tipo, valor: parseFloat(promoForm.valor) || 0, fecha_inicio: toISODate(promoForm.fecha_inicio), fecha_fin: toISODate(promoForm.fecha_fin), activa: promoForm.activa }
      if (editingPromo) {
        await promocionService.update(editingPromo.id, payload)
        setPromoSuccess('✓ Promoción actualizada correctamente')
      } else {
        await promocionService.create(restaurantId, payload)
        setPromoSuccess('✓ Promoción creada correctamente')
      }
      setShowPromoModal(false)
      fetchPromociones()
    } catch (err) {
      setPromoError(err.response?.data?.error || 'Error al guardar la promoción')
    } finally {
      setPromoLoading(false)
    }
  }

  const filteredPromociones = promociones.filter(p => {
    if (promoFilter === 'ACTIVAS') return isPromocionVigente(p)
    if (promoFilter === 'INACTIVAS') return !isPromocionVigente(p)
    return true
  })

  // ── Cupones ───────────────────────────────────────────────────────────────
  const isCuponVigente = (c) => c.activo && new Date(c.fecha_expiracion) >= new Date()

  const fetchCupones = async () => {
    if (!restaurantId) return
    setCuponLoading(true); setCuponError('')
    try {
      const result = await cuponService.getAll({ restaurante_id: restaurantId })
      setCupones(result.cupones || [])
    } catch (err) {
      setCuponError('Error al cargar los cupones')
    } finally {
      setCuponLoading(false)
    }
  }

  const openCreateCuponModal = () => {
    setEditingCupon(null)
    setCuponForm(emptyCuponForm)
    setCuponError(''); setCuponSuccess('')
    setShowCuponModal(true)
  }

  const openEditCuponModal = (cupon) => {
    setEditingCupon(cupon)
    setCuponForm({
      codigo: cupon.codigo,
      titulo: cupon.titulo,
      descripcion: cupon.descripcion || '',
      valor: String(cupon.valor),
      uso_maximo: String(cupon.uso_maximo),
      fecha_inicio: toInputDate(cupon.fecha_inicio),
      fecha_expiracion: toInputDate(cupon.fecha_expiracion),
      activo: cupon.activo,
    })
    setCuponError(''); setCuponSuccess('')
    setShowCuponModal(true)
  }

  const handleCuponSubmit = async (e) => {
    e.preventDefault()
    if (!cuponForm.codigo || !cuponForm.titulo || !cuponForm.fecha_expiracion) {
      setCuponError('Código, título y fecha de expiración son obligatorios'); return
    }
    if (parseFloat(cuponForm.valor) < 0) { setCuponError('El valor no puede ser negativo'); return }
    if (parseInt(cuponForm.uso_maximo) < 1) { setCuponError('El uso máximo debe ser al menos 1'); return }
    setCuponLoading(true); setCuponError('')
    try {
      const payload = {
        titulo: cuponForm.titulo,
        descripcion: cuponForm.descripcion,
        valor: parseFloat(cuponForm.valor) || 0,
        uso_maximo: parseInt(cuponForm.uso_maximo),
        fecha_inicio: toISODate(cuponForm.fecha_inicio),
        fecha_expiracion: toISODate(cuponForm.fecha_expiracion),
        activo: cuponForm.activo,
      }
      if (editingCupon) {
        await cuponService.update(editingCupon.id, payload)
        setCuponSuccess('✓ Cupón actualizado correctamente')
      } else {
        await cuponService.create(restaurantId, { ...payload, codigo: cuponForm.codigo })
        setCuponSuccess('✓ Cupón creado correctamente')
      }
      setShowCuponModal(false)
      fetchCupones()
    } catch (err) {
      setCuponError(err.response?.data?.error || 'Error al guardar el cupón')
    } finally {
      setCuponLoading(false)
    }
  }

  const filteredCupones = cupones.filter(c => {
    if (cuponFilter === 'VIGENTES') return isCuponVigente(c)
    if (cuponFilter === 'VENCIDOS') return !isCuponVigente(c)
    if (cuponFilter === 'AUTORIZADOS') return c.autorizado
    if (cuponFilter === 'PENDIENTES') return !c.autorizado
    return true
  })

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.logo}>🍽️</div>
          <div className={styles.logoText}>Panel Restaurante</div>
        </div>
        <div className={styles.navUser}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.email}</span>
            <span className={styles.userRole}>Restaurante</span>
          </div>
          <button onClick={handleLogout} className={styles.btnLogout}>Cerrar Sesión</button>
        </div>
      </nav>

      <div className={styles.content}>
        <div className={styles.header}>
          <h1>{restaurantName || 'Mi Restaurante'}</h1>
          <p>Gestiona tu restaurante</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {[['orders','📋 Órdenes'],['products','🍔 Productos'],['promociones','🏷️ Promociones'],['cupones','🎟️ Cupones']].map(([key, label]) => (
            <button key={key} className={`${styles.tabBtn} ${activeTab === key ? styles.tabActive : ''}`} onClick={() => handleTabChange(key)}>
              {label}
              {key === 'promociones' && promociones.filter(isPromocionVigente).length > 0 && (
                <span style={{ marginLeft:'6px', background:'#ff6b35', color:'#fff', borderRadius:'10px', padding:'1px 7px', fontSize:'0.7rem', fontWeight:700 }}>
                  {promociones.filter(isPromocionVigente).length}
                </span>
              )}
              {key === 'cupones' && cupones.filter(c => !c.autorizado).length > 0 && (
                <span style={{ marginLeft:'6px', background:'#f59e0b', color:'#fff', borderRadius:'10px', padding:'1px 7px', fontSize:'0.7rem', fontWeight:700 }}>
                  {cupones.filter(c => !c.autorizado).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        {/* ── TAB ÓRDENES ── */}
        {activeTab === 'orders' && (
          <>
            <div className={styles.filters}>
              {['TODAS','CREADA','ACEPTADA','EN_PREPARACION','TERMINADA','RECHAZADA','CANCELADA'].map(s => (
                <button key={s} className={`${styles.filterBtn} ${filter === s ? styles.active : ''}`} onClick={() => setFilter(s)}>{s.replace('_',' ')}</button>
              ))}
            </div>
            {loading ? (
              <div className={styles.loading}><div className={styles.spinner}></div><p>Cargando órdenes...</p></div>
            ) : filteredOrders.length === 0 ? (
              <div className={styles.empty}><div className={styles.emptyIcon}>📋</div><p>No hay órdenes {filter !== 'TODAS' ? `en estado ${filter}` : ''}</p><small>Las órdenes aparecerán aquí cuando los clientes realicen pedidos</small></div>
            ) : (
              <div className={styles.ordersList}>
                {filteredOrders.map(order => (
                  <div key={order.id} className={styles.orderCard}>
                    <div className={styles.orderHeader}>
                      <div className={styles.orderInfo}><h3>Orden #{order.id}</h3><div className={styles.orderMeta}>Cliente: {order.cliente_nombre}</div></div>
                      <span className={`${styles.statusBadge} ${getStatusClass(order.estado)}`}>{order.estado.replace('_',' ')}</span>
                    </div>
                    <div className={styles.orderDetails}>
                      <div className={styles.detailRow}><span className={styles.detailLabel}>Total:</span><span className={styles.detailValue}>${order.costo_total.toFixed(2)}</span></div>
                      <div className={styles.detailRow}><span className={styles.detailLabel}>Dirección:</span><span className={styles.detailValue}>{order.direccion_entrega}</span></div>
                    </div>
                    <div className={styles.orderActions}>
                      {order.estado === 'CREADA' && (
                        <>
                          <button className={`${styles.btn} ${styles.btnAccept}`} onClick={() => updateOrderStatus(order.id,'ACEPTADA')}>✓ Aceptar</button>
                          <button className={`${styles.btn} ${styles.btnReject}`} onClick={() => updateOrderStatus(order.id,'RECHAZADA')}>✗ Rechazar</button>
                        </>
                      )}
                      {(order.estado === 'ACEPTADA' || order.estado === 'EN_PREPARACION') && (
                        <>
                          <button className={`${styles.btn} ${styles.btnNext}`} onClick={() => updateOrderStatus(order.id, order.estado === 'ACEPTADA' ? 'EN_PREPARACION' : 'TERMINADA')}>{getNextStatusLabel(order.estado)}</button>
                          <button className={`${styles.btn} ${styles.btnCancel}`} onClick={() => { setSelectedOrder(order); setShowCancelModal(true); setCancelReason('') }}>Cancelar Orden</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB PRODUCTOS ── */}
        {activeTab === 'products' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
              <h2 style={{ margin:0, fontSize:'1.25rem', color:'#333' }}>Mis Productos</h2>
              <button className={`${styles.btn} ${styles.btnAccept}`} onClick={() => setShowProductModal(true)}>+ Agregar Producto</button>
            </div>
            {loading ? (
              <div className={styles.loading}><div className={styles.spinner}></div><p>Cargando productos...</p></div>
            ) : products.length === 0 ? (
              <div className={styles.empty}><div className={styles.emptyIcon}>🍔</div><p>No tienes productos registrados</p><small>Agrega tu primer producto usando el botón de arriba</small></div>
            ) : (
              <div className={styles.productGrid}>
                {products.map(product => (
                  <div key={product.id} className={styles.productCard}>
                    <h4>{product.nombre}</h4>
                    {product.descripcion && <p className={styles.productDesc}>{product.descripcion}</p>}
                    <div className={styles.productMeta}>
                      <span className={styles.productPrice}>${product.precio.toFixed(2)}</span>
                      <span className={styles.productCategory}>{product.categoria}</span>
                    </div>
                    <div className={styles.productStatus}>
                      {product.disponible ? <span className={styles.available}>✓ Disponible</span> : <span className={styles.unavailable}>✗ No disponible</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB PROMOCIONES ── */}
        {activeTab === 'promociones' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
              <div>
                <h2 style={{ margin:0, fontSize:'1.25rem', color:'#333' }}>Mis Promociones</h2>
                <p style={{ margin:'4px 0 0', fontSize:'0.85rem', color:'#666' }}>
                  {promociones.filter(isPromocionVigente).length} activas · {promociones.length} total
                </p>
              </div>
              <button className={`${styles.btn} ${styles.btnAccept}`} onClick={openCreateModal}>+ Nueva Promoción</button>
            </div>

            {promoSuccess && <div className={`${styles.alert} ${styles.alertSuccess}`} style={{ marginBottom:'1rem' }}>{promoSuccess}</div>}
            {promoError && !showPromoModal && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom:'1rem' }}>{promoError}</div>}

            <div className={styles.filters} style={{ marginBottom:'1.5rem' }}>
              {[['TODAS','Todas'],['ACTIVAS','✅ Activas'],['INACTIVAS','⛔ Inactivas/Vencidas']].map(([val,label]) => (
                <button key={val} className={`${styles.filterBtn} ${promoFilter === val ? styles.active : ''}`} onClick={() => setPromoFilter(val)}>{label}</button>
              ))}
            </div>

            {promoLoading ? (
              <div className={styles.loading}><div className={styles.spinner}></div><p>Cargando promociones...</p></div>
            ) : filteredPromociones.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🏷️</div>
                <p>No hay promociones {promoFilter !== 'TODAS' ? 'con este filtro' : 'creadas aún'}</p>
                <small>Crea tu primera promoción para atraer más clientes</small>
                <button className={`${styles.btn} ${styles.btnAccept}`} style={{ marginTop:'1rem' }} onClick={openCreateModal}>+ Crear Promoción</button>
              </div>
            ) : (
              <div className={styles.productGrid}>
                {filteredPromociones.map(promo => {
                  const vigente = isPromocionVigente(promo)
                  return (
                    <div key={promo.id} className={styles.productCard} style={{ borderLeft:`4px solid ${vigente ? '#4caf50' : '#ccc'}`, opacity: vigente ? 1 : 0.72 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem' }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', background: promo.tipo === 'PORCENTAJE' ? '#e8f5e9' : '#e3f2fd', color: promo.tipo === 'PORCENTAJE' ? '#2e7d32' : '#1565c0', padding:'2px 8px', borderRadius:'4px' }}>
                          {TIPO_LABELS[promo.tipo]}
                        </span>
                        <span style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:'4px', fontWeight:600, background: vigente ? '#e8f5e9' : '#f5f5f5', color: vigente ? '#2e7d32' : '#9e9e9e' }}>
                          {vigente ? '● Activa' : '○ Inactiva'}
                        </span>
                      </div>
                      <h4 style={{ marginBottom:'0.25rem' }}>{promo.titulo}</h4>
                      {promo.descripcion && <p className={styles.productDesc}>{promo.descripcion}</p>}
                      <div style={{ margin:'0.75rem 0', padding:'0.5rem', background:'#f9f9f9', borderRadius:'6px', textAlign:'center' }}>
                        {promo.tipo === 'PORCENTAJE'
                          ? <span style={{ fontSize:'1.75rem', fontWeight:700, color:'#ff6b35' }}>{promo.valor}% OFF</span>
                          : <span style={{ fontSize:'1.1rem', fontWeight:700, color:'#1565c0' }}>🚚 Envío sin costo</span>
                        }
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'#666', marginBottom:'0.75rem' }}>
                        <div>📅 Inicio: {new Date(promo.fecha_inicio).toLocaleDateString('es-GT')}</div>
                        <div>📅 Fin: {new Date(promo.fecha_fin).toLocaleDateString('es-GT')}</div>
                      </div>
                      <button className={`${styles.btn} ${styles.btnNext}`} style={{ width:'100%', marginTop:'auto' }} onClick={() => openEditModal(promo)}>✏️ Editar</button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB CUPONES ── */}
        {activeTab === 'cupones' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
              <div>
                <h2 style={{ margin:0, fontSize:'1.25rem', color:'#333' }}>Mis Cupones</h2>
                <p style={{ margin:'4px 0 0', fontSize:'0.85rem', color:'#666' }}>
                  {cupones.filter(isCuponVigente).length} vigentes · {cupones.filter(c => c.autorizado).length} autorizados · {cupones.length} total
                </p>
              </div>
              <button className={`${styles.btn} ${styles.btnAccept}`} onClick={openCreateCuponModal}>+ Nuevo Cupón</button>
            </div>

            {cuponSuccess && <div className={`${styles.alert} ${styles.alertSuccess}`} style={{ marginBottom:'1rem' }}>{cuponSuccess}</div>}
            {cuponError && !showCuponModal && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom:'1rem' }}>{cuponError}</div>}

            <div className={styles.filters} style={{ marginBottom:'1.5rem' }}>
              {[['TODOS','Todos'],['VIGENTES','✅ Vigentes'],['VENCIDOS','⛔ Vencidos'],['AUTORIZADOS','✔️ Autorizados'],['PENDIENTES','⏳ Pendientes']].map(([val,label]) => (
                <button key={val} className={`${styles.filterBtn} ${cuponFilter === val ? styles.active : ''}`} onClick={() => setCuponFilter(val)}>{label}</button>
              ))}
            </div>

            {cuponLoading ? (
              <div className={styles.loading}><div className={styles.spinner}></div><p>Cargando cupones...</p></div>
            ) : filteredCupones.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🎟️</div>
                <p>No hay cupones {cuponFilter !== 'TODOS' ? 'con este filtro' : 'creados aún'}</p>
                <small>Crea tu primer cupón para ofrecer descuentos a tus clientes</small>
                <button className={`${styles.btn} ${styles.btnAccept}`} style={{ marginTop:'1rem' }} onClick={openCreateCuponModal}>+ Crear Cupón</button>
              </div>
            ) : (
              <div className={styles.productGrid}>
                {filteredCupones.map(cupon => {
                  const vigente = isCuponVigente(cupon)
                  const usosRestantes = cupon.uso_maximo - cupon.usos_actuales
                  return (
                    <div key={cupon.id} className={styles.productCard} style={{ borderLeft:`4px solid ${vigente ? (cupon.autorizado ? '#4caf50' : '#f59e0b') : '#ccc'}`, opacity: vigente ? 1 : 0.72 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem', gap:'6px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, fontFamily:'monospace', background:'#f3f4f6', color:'#374151', padding:'2px 8px', borderRadius:'4px', border:'1px solid #e5e7eb' }}>
                          {cupon.codigo}
                        </span>
                        <div style={{ display:'flex', gap:'4px' }}>
                          <span style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:'4px', fontWeight:600, background: cupon.autorizado ? '#e8f5e9' : '#fff3e0', color: cupon.autorizado ? '#2e7d32' : '#e65100' }}>
                            {cupon.autorizado ? '✔ Autorizado' : '⏳ Pendiente'}
                          </span>
                          <span style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:'4px', fontWeight:600, background: vigente ? '#e8f5e9' : '#f5f5f5', color: vigente ? '#2e7d32' : '#9e9e9e' }}>
                            {vigente ? '● Vigente' : '○ Vencido'}
                          </span>
                        </div>
                      </div>
                      <h4 style={{ marginBottom:'0.25rem' }}>{cupon.titulo}</h4>
                      {cupon.descripcion && <p className={styles.productDesc}>{cupon.descripcion}</p>}
                      <div style={{ margin:'0.75rem 0', padding:'0.5rem', background:'#f9f9f9', borderRadius:'6px', textAlign:'center' }}>
                        <span style={{ fontSize:'1.75rem', fontWeight:700, color:'#ff6b35' }}>
                          {cupon.valor > 0 ? `${cupon.valor}% OFF` : '🚚 Envío gratis'}
                        </span>
                      </div>
                      <div style={{ marginBottom:'0.5rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'#555', marginBottom:'4px' }}>
                          <span>Usos: {cupon.usos_actuales} / {cupon.uso_maximo}</span>
                          <span style={{ color: usosRestantes <= 0 ? '#e53935' : '#388e3c', fontWeight:600 }}>
                            {usosRestantes > 0 ? `${usosRestantes} restantes` : 'Agotado'}
                          </span>
                        </div>
                        <div style={{ height:'4px', borderRadius:'4px', background:'#e5e7eb', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min((cupon.usos_actuales / cupon.uso_maximo) * 100, 100)}%`, background: usosRestantes <= 0 ? '#e53935' : '#4caf50', borderRadius:'4px' }} />
                        </div>
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'#666', marginBottom:'0.75rem' }}>
                        <div>📅 Inicio: {new Date(cupon.fecha_inicio).toLocaleDateString('es-GT')}</div>
                        <div>📅 Expira: {new Date(cupon.fecha_expiracion).toLocaleDateString('es-GT')}</div>
                      </div>
                      <button className={`${styles.btn} ${styles.btnNext}`} style={{ width:'100%', marginTop:'auto' }} onClick={() => openEditCuponModal(cupon)}>✏️ Editar</button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Cancelar Orden */}
      {showCancelModal && (
        <div className={styles.modal} onClick={() => setShowCancelModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalHeader}>Cancelar Orden #{selectedOrder?.id}</h3>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Motivo *</label>
              <textarea className={styles.formInput} rows="3" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Ej: Ingredientes no disponibles" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setShowCancelModal(false)}>Cerrar</button>
              <button className={`${styles.btn} ${styles.btnCancel}`} onClick={handleCancelOrder}>Confirmar Cancelación</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Producto */}
      {showProductModal && (
        <div className={styles.modal} onClick={() => setShowProductModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalHeader}>Agregar Nuevo Producto</h3>
            <form onSubmit={handleCreateProduct}>
              <div className={styles.formGroup}><label className={styles.formLabel}>Nombre *</label><input type="text" className={styles.formInput} value={productForm.nombre} onChange={e => setProductForm({...productForm, nombre: e.target.value})} placeholder="Ej: Hamburguesa Clásica" required /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Descripción</label><textarea className={styles.formInput} rows="2" value={productForm.descripcion} onChange={e => setProductForm({...productForm, descripcion: e.target.value})} placeholder="Ej: Carne y queso" /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Precio *</label><input type="number" step="0.01" min="0" className={styles.formInput} value={productForm.precio} onChange={e => setProductForm({...productForm, precio: e.target.value})} placeholder="45.50" required /></div>
              <div className={styles.formGroup}><label className={styles.formLabel}>Categoría *</label><input type="text" className={styles.formInput} value={productForm.categoria} onChange={e => setProductForm({...productForm, categoria: e.target.value})} placeholder="Ej: COMIDA RAPIDA" required /></div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => { setShowProductModal(false); setProductForm({ nombre:'', descripcion:'', precio:'', categoria:'' }) }}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnAccept}`} disabled={loading}>{loading ? 'Creando...' : 'Crear Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Promoción */}
      {showPromoModal && (
        <div className={styles.modal} onClick={() => setShowPromoModal(false)}>
          <div className={styles.modalContent} style={{ maxWidth:'480px' }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalHeader}>{editingPromo ? `✏️ Editar Promoción #${editingPromo.id}` : '🏷️ Nueva Promoción'}</h3>

            {promoError && <div className={`${styles.alert} ${styles.alertError}`} style={{ margin:'0 0 1rem' }}>{promoError}</div>}

            <form onSubmit={handlePromoSubmit} style={{ padding:'0 0.25rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Título *</label>
                <input type="text" className={styles.formInput} value={promoForm.titulo} onChange={e => setPromoForm({...promoForm, titulo: e.target.value})} placeholder="Ej: 20% en toda la carta" maxLength={100} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Descripción</label>
                <textarea className={styles.formInput} rows="2" value={promoForm.descripcion} onChange={e => setPromoForm({...promoForm, descripcion: e.target.value})} placeholder="Describe brevemente la promoción" maxLength={255} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tipo *</label>
                  <select className={styles.formInput} value={promoForm.tipo} onChange={e => setPromoForm({...promoForm, tipo: e.target.value, valor: ''})}>
                    <option value="PORCENTAJE">% Descuento</option>
                    <option value="ENVIO_GRATIS">Envío Gratis</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>{promoForm.tipo === 'PORCENTAJE' ? 'Porcentaje (1–100) *' : 'Valor (automático 0)'}</label>
                  <input type="number" className={styles.formInput} value={promoForm.tipo === 'ENVIO_GRATIS' ? '0' : promoForm.valor}
                    onChange={e => setPromoForm({...promoForm, valor: e.target.value})}
                    placeholder={promoForm.tipo === 'PORCENTAJE' ? '20' : '0'}
                    min="0" max={promoForm.tipo === 'PORCENTAJE' ? '100' : undefined} step="0.01"
                    required={promoForm.tipo === 'PORCENTAJE'} disabled={promoForm.tipo === 'ENVIO_GRATIS'} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Fecha inicio</label>
                  <input type="date" className={styles.formInput} value={promoForm.fecha_inicio} onChange={e => setPromoForm({...promoForm, fecha_inicio: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Fecha fin *</label>
                  <input type="date" className={styles.formInput} value={promoForm.fecha_fin} onChange={e => setPromoForm({...promoForm, fecha_fin: e.target.value})} required />
                </div>
              </div>
              {editingPromo && (
                <div className={styles.formGroup} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <input type="checkbox" id="promoActiva" checked={promoForm.activa} onChange={e => setPromoForm({...promoForm, activa: e.target.checked})} style={{ width:'16px', height:'16px', cursor:'pointer' }} />
                  <label htmlFor="promoActiva" className={styles.formLabel} style={{ margin:0, cursor:'pointer' }}>Promoción activa</label>
                </div>
              )}
              <div className={styles.modalActions} style={{ marginTop:'1rem' }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowPromoModal(false)}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnAccept}`} disabled={promoLoading}>{promoLoading ? 'Guardando...' : editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Cupón */}
      {showCuponModal && (
        <div className={styles.modal} onClick={() => setShowCuponModal(false)}>
          <div className={styles.modalContent} style={{ maxWidth:'500px' }} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalHeader}>{editingCupon ? `✏️ Editar Cupón #${editingCupon.id}` : '🎟️ Nuevo Cupón'}</h3>

            {cuponError && <div className={`${styles.alert} ${styles.alertError}`} style={{ margin:'0 0 1rem' }}>{cuponError}</div>}

            <form onSubmit={handleCuponSubmit} style={{ padding:'0 0.25rem' }}>
              {/* Código — solo al crear */}
              {!editingCupon && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={cuponForm.codigo}
                    onChange={e => setCuponForm({...cuponForm, codigo: e.target.value.toUpperCase()})}
                    placeholder="Ej: VERANO20"
                    maxLength={32}
                    style={{ fontFamily:'monospace', letterSpacing:'1px' }}
                    required
                  />
                  <small style={{ color:'#888', fontSize:'0.75rem' }}>Único por restaurante. Solo letras y números.</small>
                </div>
              )}
              {editingCupon && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código</label>
                  <input type="text" className={styles.formInput} value={cuponForm.codigo} disabled style={{ fontFamily:'monospace', background:'#f5f5f5', color:'#888' }} />
                  <small style={{ color:'#888', fontSize:'0.75rem' }}>El código no puede modificarse una vez creado.</small>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Título *</label>
                <input type="text" className={styles.formInput} value={cuponForm.titulo} onChange={e => setCuponForm({...cuponForm, titulo: e.target.value})} placeholder="Ej: 20% de descuento en tu orden" maxLength={100} required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Descripción</label>
                <textarea className={styles.formInput} rows="2" value={cuponForm.descripcion} onChange={e => setCuponForm({...cuponForm, descripcion: e.target.value})} placeholder="Describe brevemente el cupón" maxLength={255} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descuento (%) *</label>
                  <input type="number" className={styles.formInput} value={cuponForm.valor} onChange={e => setCuponForm({...cuponForm, valor: e.target.value})} placeholder="20" min="0" max="100" step="0.01" required />
                  <small style={{ color:'#888', fontSize:'0.75rem' }}>0 = envío gratis</small>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Usos máximos *</label>
                  <input type="number" className={styles.formInput} value={cuponForm.uso_maximo} onChange={e => setCuponForm({...cuponForm, uso_maximo: e.target.value})} placeholder="1" min="1" required />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Fecha inicio</label>
                  <input type="date" className={styles.formInput} value={cuponForm.fecha_inicio} onChange={e => setCuponForm({...cuponForm, fecha_inicio: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Fecha expiración *</label>
                  <input type="date" className={styles.formInput} value={cuponForm.fecha_expiracion} onChange={e => setCuponForm({...cuponForm, fecha_expiracion: e.target.value})} required />
                </div>
              </div>

              {editingCupon && (
                <div className={styles.formGroup} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <input type="checkbox" id="cuponActivo" checked={cuponForm.activo} onChange={e => setCuponForm({...cuponForm, activo: e.target.checked})} style={{ width:'16px', height:'16px', cursor:'pointer' }} />
                  <label htmlFor="cuponActivo" className={styles.formLabel} style={{ margin:0, cursor:'pointer' }}>Cupón activo</label>
                </div>
              )}

              {!editingCupon && (
                <div style={{ padding:'0.75rem', background:'#fff3e0', borderRadius:'6px', marginBottom:'0.75rem', fontSize:'0.82rem', color:'#e65100' }}>
                  ⏳ El cupón quedará <strong>pendiente de autorización</strong> por el administrador antes de poder ser usado.
                </div>
              )}

              <div className={styles.modalActions} style={{ marginTop:'1rem' }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowCuponModal(false)}>Cancelar</button>
                <button type="submit" className={`${styles.btn} ${styles.btnAccept}`} disabled={cuponLoading}>
                  {cuponLoading ? 'Guardando...' : editingCupon ? 'Guardar Cambios' : 'Crear Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RestaurantDashboard
