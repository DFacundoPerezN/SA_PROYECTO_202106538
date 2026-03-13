import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, promocionService } from '../services/api'
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
          {[['orders','📋 Órdenes'],['products','🍔 Productos'],['promociones','🏷️ Promociones']].map(([key, label]) => (
            <button key={key} className={`${styles.tabBtn} ${activeTab === key ? styles.tabActive : ''}`} onClick={() => handleTabChange(key)}>
              {label}
              {key === 'promociones' && promociones.filter(isPromocionVigente).length > 0 && (
                <span style={{ marginLeft:'6px', background:'#ff6b35', color:'#fff', borderRadius:'10px', padding:'1px 7px', fontSize:'0.7rem', fontWeight:700 }}>
                  {promociones.filter(isPromocionVigente).length}
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
    </div>
  )
}

export default RestaurantDashboard
