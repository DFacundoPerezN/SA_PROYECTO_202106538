import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, restaurantService } from '../services/api'
import api from '../services/api'
import '../styles/Dashboard.css'

const AdminDashboard = () => {
const navigate = useNavigate()
const user = authService.getCurrentUser()
const [activeTab, setActiveTab] = useState('restaurants')
const [restaurants, setRestaurants] = useState([])
const [users, setUsers] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

// Estados para pagos
const [payments, setPayments] = useState([])
const [loadingPayments, setLoadingPayments] = useState(false)

// Estados para reembolsos
const [cancelledOrders, setCancelledOrders] = useState([])
const [loadingRefunds, setLoadingRefunds] = useState(false)

// Modal para ver órdenes del usuario
const [showUserOrdersModal, setShowUserOrdersModal] = useState(false)
const [selectedUser, setSelectedUser] = useState(null)
const [userOrders, setUserOrders] = useState([])
const [loadingOrders, setLoadingOrders] = useState(false)

// Modal para ver imagen de orden
const [showImageModal, setShowImageModal] = useState(false)
const [orderImageUrl, setOrderImageUrl] = useState('')
const [loadingImage, setLoadingImage] = useState(false)

// Modal de crear restaurante
const [showCreateModal, setShowCreateModal] = useState(false)
const [creationStep, setCreationStep] = useState(1) // Paso 1: Usuario, Paso 2: Restaurante
const [createdUserId, setCreatedUserId] = useState(null)

// Formulario de usuario
const [userForm, setUserForm] = useState({
  email: '',
  password: '',
  nombre_completo: '',
  telefono: ''
})

// Formulario de restaurante
const [restaurantForm, setRestaurantForm] = useState({
  nombre: '',
  direccion: '',
  telefono: '',
  latitud: 13.69230,
  longitud: -89.2184,
  horario_apertura: '10:00:00',
  horario_cierre: '22:00:00'
})

  useEffect(() => {
    if (activeTab === 'restaurants') {
      fetchRestaurants()
    } else if (activeTab === 'refunds') {
    fetchCancelledOrders()
    } else if (activeTab === 'payments') {
    fetchPayments()
    } else {
      fetchUsers()
    }
  }, [activeTab])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const data = await restaurantService.getAll()
      setRestaurants(data.restaurants || [])
      setError('')
    } catch (err) {
      console.error('Error fetching restaurants:', err)
      setError('Error al cargar restaurantes')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/users?page=1&pageSize=100')
      setUsers(response.data.data || [])
      setError('')
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const fetchCancelledOrders = async () => {
    try {
      setLoadingRefunds(true)
      const response = await api.get('/api/orders/cancelled')
      setCancelledOrders(response.data || [])
      setError('')
    } catch (err) {
      console.error('Error fetching cancelled orders:', err)
      setError('Error al cargar órdenes canceladas')
    } finally {
      setLoadingRefunds(false)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true)
      const response = await api.get('/api/payments')
      setPayments(response.data || [])
      setError('')
    } catch (err) {
      console.error('Error fetching payments:', err)
      setError('Error al cargar los pagos')
    } finally {
      setLoadingPayments(false)
    }
  }

  // Funcion autorizar reembolso
  const handleAuthorizeRefund = async (orderId) => {
  if (!window.confirm(`¿Autorizar reembolso para la orden #${orderId}?`)) {
    return
  }

  try {
    setLoading(true)
    const response = await api.patch(`/api/payments/${orderId}/refund`)
    
    alert(response.data.message || 'Reembolso autorizado exitosamente')
    
    // Recargar la lista
    fetchCancelledOrders()
    
  } catch (err) {
    console.error('Error authorizing refund:', err)
    const errorMessage = err.response?.data?.error || 'Error al autorizar el reembolso'
    alert('Error: ' + errorMessage)
  } finally {
    setLoading(false)
  }
}

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

// Paso 1: Crear usuario
const handleCreateUser = async (e) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const userData = {
      email: userForm.email,
      password: userForm.password,
      role: 'RESTAURANTE',
      nombre_completo: userForm.nombre_completo,
      telefono: userForm.telefono
    }

    const response = await api.post('/api/users', userData)
    
    setCreatedUserId(response.data.id)
    setCreationStep(2) // Pasar al paso 2
    
    // Pre-llenar el teléfono del restaurante con el del usuario
    setRestaurantForm({
      ...restaurantForm,
      telefono: userForm.telefono
    })
    
  } catch (err) {
    console.error('Error creating user:', err)
    const errorMessage = err.response?.data?.error || 'Error al crear el usuario'
    setError(errorMessage)
    alert('Error: ' + errorMessage)
  } finally {
    setLoading(false)
  }
}

// Paso 2: Crear restaurante
const handleCreateRestaurant = async (e) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const data = {
      user_id: createdUserId,  // ← Debe ser createdUserId, NO user.id
      nombre: restaurantForm.nombre,
      direccion: restaurantForm.direccion,
      telefono: restaurantForm.telefono,
      latitud: parseFloat(restaurantForm.latitud),
      longitud: parseFloat(restaurantForm.longitud),
      horario_apertura: restaurantForm.horario_apertura,
      horario_cierre: restaurantForm.horario_cierre
    }

    console.log('Creando restaurante con data:', data) // Para debug

    await restaurantService.create(data)
    
    alert('¡Usuario y restaurante creados exitosamente!')
    setShowCreateModal(false)
    resetForm()
    fetchRestaurants()
    
  } catch (err) {
    console.error('Error creating restaurant:', err)
    const errorMessage = err.response?.data?.error || 'Error al crear el restaurante'
    setError(errorMessage)
    alert('Error: ' + errorMessage)
  } finally {
    setLoading(false)
  }
}

const resetForm = () => {
  setCreationStep(1)
  setCreatedUserId(null)
  setUserForm({
    email: '',
    password: '',
    nombre_completo: '',
    telefono: ''
  })
  setRestaurantForm({
    nombre: '',
    direccion: '',
    telefono: '',
    latitud: 13.69230,
    longitud: -89.2184,
    horario_apertura: '10:00:00',
    horario_cierre: '22:00:00'
  })
  setError('')
}

// Función para ver órdenes de un usuario
const handleViewUserOrders = async (user) => {
  setSelectedUser(user)
  setShowUserOrdersModal(true)
  setLoadingOrders(true)
  
  try {
    const response = await api.get(`/api/orders/delivered?user_id=${user.id}`)
    setUserOrders(response.data || [])
  } catch (err) {
    console.error('Error fetching user orders:', err)
    setUserOrders([])
  } finally {
    setLoadingOrders(false)
  }
}

// Función para ver imagen de una orden (se activa al hacer clic en una orden)
const handleOrderClick = async (orderId) => {
  setLoadingImage(true)
  setShowImageModal(true)
  
  try {
    const response = await api.get(`/api/orders/${orderId}/image`)
    // El endpoint devuelve { link: "url" }
    setOrderImageUrl(response.data.link || response.data.url || '')
  } catch (err) {
    console.error('Error fetching order image:', err)
    setOrderImageUrl('')
    alert('No se pudo cargar la imagen de la orden')
  } finally {
    setLoadingImage(false)
  }
}

const handleCloseUserOrdersModal = () => {
  setShowUserOrdersModal(false)
  setSelectedUser(null)
  setUserOrders([])
}

const handleCloseImageModal = () => {
  setShowImageModal(false)
  setOrderImageUrl('')
}

const handleCloseModal = () => {
  setShowCreateModal(false)
  resetForm()
}

  // Filtrar usuarios tipo RESTAURANTE
  const restaurantUsers = users.filter(u => u.role === 'RESTAURANTE')

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="logo-icon">🚀</div>
          <div className="logo-text">DeliveryApp</div>
        </div>
        <div className="nav-user">
          <div className="user-info">
            
            <span className="user-role">Administrador</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Panel de Administración</h1>
          <p>Gestiona restaurantes y usuarios</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            🍽️ Restaurantes
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
           >
            👥 Usuarios
          </button>
          <button 
            className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💳 Pagos
          </button>
          <button 
            className={`tab ${activeTab === 'refunds' ? 'active' : ''}`}
            onClick={() => setActiveTab('refunds')}
          >
            💰 Reembolsos
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Tab: Restaurantes */}
        {activeTab === 'restaurants' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Lista de Restaurantes</h2>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Crear Restaurante
              </button>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner-large"></div>
                <p>Cargando...</p>
              </div>
            ) : restaurants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🍽️</div>
                <p>No hay restaurantes registrados</p>
                <small>Crea el primer restaurante usando el botón de arriba</small>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Dirección</th>
                      <th>Teléfono</th>
                      <th>Calificación</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map(restaurant => (
                      <tr key={restaurant.id}>
                        <td>{restaurant.id}</td>
                        <td><strong>{restaurant.nombre}</strong></td>
                        <td>{restaurant.direccion}</td>
                        <td>{restaurant.telefono}</td>
                        <td>⭐ {restaurant.calificacion?.toFixed(1) || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${restaurant.activo ? 'active' : 'inactive'}`}>
                            {restaurant.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Usuarios */}
        {activeTab === 'users' && (
          <div className="tab-content">
            <h2>Lista de Usuarios</h2>

            {loading ? (
              <div className="loading-state">
                <div className="spinner-large"></div>
                <p>Cargando...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No hay usuarios registrados</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Teléfono</th>
                      <th>Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr 
                        key={user.id}
                        onClick={() => handleViewUserOrders(user)}
                        style={{ cursor: 'pointer' }}
                        title="Click para ver órdenes del usuario"
                      >
                        <td>{user.id}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${user.role.toLowerCase()}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>{user.telefono || 'N/A'}</td>
                        <td>{new Date(user.fecha_registro).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

                {/* Tab: Pagos */}
        {activeTab === 'payments' && (
          <div className="tab-content">
            <div className="section-header">
              <div>
                <h2>Historial de Pagos</h2>
                <p className="section-description">
                  Visualiza todas las transacciones realizadas
                </p>
              </div>
              <button 
                className="btn-primary"
                onClick={fetchPayments}
                disabled={loadingPayments}
              >
                🔄 Actualizar
              </button>
            </div>

            {loadingPayments ? (
              <div className="loading-state">
                <div className="spinner-large"></div>
                <p>Cargando pagos...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <p>No hay pagos registrados</p>
                <small>Los pagos realizados aparecerán aquí</small>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Pago</th>
                      <th>ID Orden</th>
                      <th>ID Cliente</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Cupón</th>
                      <th>Estado</th>
                      <th>Moneda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td>
                          <strong>#{payment.id}</strong>
                        </td>
                        <td>
                          <span className="order-link">
                            Orden #{payment.order_id}
                          </span>
                        </td>
                        <td>
                          Cliente #{payment.client_id}
                        </td>
                        <td>
                          <strong className="amount-value">
                            ${payment.precio_final}
                          </strong>
                        </td>
                        <td>
                          <span className={`payment-method ${payment.metodo_pago}`}>
                             {payment.metodo_pago}
                          </span>
                        </td>
                        <td>
                          {payment.usa_cupon ? (
                            <span className="cupon-badge">
                              ✓ Usado
                            </span>
                          ) : (
                            <span className="no-cupon">
                              No uso
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${payment.estado === 'PAGADO' ? 'active' : 'inactive'}`}>
                            {payment.estado}
                          </span>
                        </td>
                        <td>
                          {payment.moneda}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Reembolsos */}
        {activeTab === 'refunds' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2>Órdenes Canceladas y Rechazadas</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Gestiona los reembolsos pendientes
                </p>
              </div>
              <button 
                className="btn-primary"
                onClick={fetchCancelledOrders}
                disabled={loadingRefunds}
              >
                🔄 Actualizar
              </button>
            </div>

            {loadingRefunds ? (
              <div className="loading-state">
                <div className="spinner-large"></div>
                <p>Cargando órdenes...</p>
              </div>
            ) : cancelledOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <p>No hay órdenes canceladas o rechazadas</p>
                <small>Las órdenes que requieran reembolso aparecerán aquí</small>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Orden</th>
                      <th>Cliente</th>
                      <th>Estado</th>
                      <th>Monto</th>
                      <th>Motivo</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelledOrders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.id}</strong>
                        </td>
                        <td>{order.cliente_nombre}</td>
                        <td>
                          <span className={`role-badge ${order.estado === 'CANCELADA' ? 'cancelada' : 'rechazada'}`}>
                            {order.estado}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--error)' }}>
                            ${order.costo_total.toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <div style={{ 
                            maxWidth: '300px', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem'
                          }}>
                            {order.motivo || 'Sin motivo especificado'}
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn-primary"
                            onClick={() => handleAuthorizeRefund(order.id)}
                            disabled={loading}
                            style={{
                              padding: '8px 16px',
                              fontSize: '0.875rem',
                              background: 'linear-gradient(135deg, #4caf50, #45a049)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            💰 Autorizar Reembolso
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Crear Restaurante */}
{showCreateModal && (
  <div className="modal-overlay" onClick={handleCloseModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>
          {creationStep === 1 ? 'Paso 1: Crear Usuario Dueño' : 'Paso 2: Crear Restaurante'}
        </h2>
        <button className="btn-close" onClick={handleCloseModal}>✕</button>
      </div>

      {/* Indicador de pasos */}
      <div className="steps-indicator">
        <div className={`step ${creationStep >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Usuario</div>
        </div>
        <div className="step-line"></div>
        <div className={`step ${creationStep >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Restaurante</div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ margin: '0 24px' }}>
          {error}
        </div>
      )}

      {/* PASO 1: Crear Usuario */}
      {creationStep === 1 && (
        <form onSubmit={handleCreateUser}>
          <div style={{ padding: '24px' }}>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                className="form-input"
                placeholder="restaurante@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña *</label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>Nombre del Dueño *</label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                className="form-input"
                placeholder="Nombre completo del dueño"
                required
              />
            </div>

            <div className="form-group">
              <label>Teléfono *</label>
              <input
                type="tel"
                value={userForm.telefono}
                onChange={(e) => setUserForm({...userForm, telefono: e.target.value})}
                className="form-input"
                placeholder="+503 2222-1111"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={handleCloseModal}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creando usuario...' : 'Siguiente →'}
            </button>
          </div>
        </form>
      )}

      {/* PASO 2: Crear Restaurante */}
      {creationStep === 2 && (
        <form onSubmit={handleCreateRestaurant}>
          <div style={{ padding: '24px' }}>
            <div className="success-message">
              ✅ Usuario creado exitosamente (ID: {createdUserId})
            </div>

            <div className="form-group">
              <label>Nombre del Restaurante *</label>
              <input
                type="text"
                value={restaurantForm.nombre}
                onChange={(e) => setRestaurantForm({...restaurantForm, nombre: e.target.value})}
                className="form-input"
                placeholder="Ej: Pizza Hut"
                required
              />
            </div>

            <div className="form-group">
              <label>Dirección *</label>
              <input
                type="text"
                value={restaurantForm.direccion}
                onChange={(e) => setRestaurantForm({...restaurantForm, direccion: e.target.value})}
                className="form-input"
                placeholder="Ej: Centro Comercial Metrocentro"
                required
              />
            </div>

            <div className="form-group">
              <label>Teléfono *</label>
              <input
                type="tel"
                value={restaurantForm.telefono}
                onChange={(e) => setRestaurantForm({...restaurantForm, telefono: e.target.value})}
                className="form-input"
                placeholder="+503 2222-1111"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Latitud</label>
                <input
                  type="number"
                  step="0.000001"
                  value={restaurantForm.latitud}
                  onChange={(e) => setRestaurantForm({...restaurantForm, latitud: e.target.value})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Longitud</label>
                <input
                  type="number"
                  step="0.000001"
                  value={restaurantForm.longitud}
                  onChange={(e) => setRestaurantForm({...restaurantForm, longitud: e.target.value})}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Horario Apertura</label>
                <input
                  type="time"
                  value={restaurantForm.horario_apertura.substring(0, 5)}
                  onChange={(e) => setRestaurantForm({...restaurantForm, horario_apertura: e.target.value + ':00'})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Horario Cierre</label>
                <input
                  type="time"
                  value={restaurantForm.horario_cierre.substring(0, 5)}
                  onChange={(e) => setRestaurantForm({...restaurantForm, horario_cierre: e.target.value + ':00'})}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setCreationStep(1)}
            >
              ← Atrás
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creando restaurante...' : 'Crear Restaurante'}
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
)}

      {/* Modal Ver Órdenes del Usuario */}
      {showUserOrdersModal && (
        <div className="modal-overlay" onClick={handleCloseUserOrdersModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Órdenes de {selectedUser?.email}</h2>
              <button className="btn-close" onClick={handleCloseUserOrdersModal}>✕</button>
            </div>

            <div style={{ padding: '24px' }}>
              {loadingOrders ? (
                <div className="loading-state">
                  <div className="spinner-large"></div>
                  <p>Cargando órdenes...</p>
                </div>
              ) : userOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <p>Este usuario no tiene órdenes registradas</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID Orden</th>
                        <th>Restaurante</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userOrders.map(order => (
                        <tr 
                          key={order.id}
                          onClick={() => handleOrderClick(order.id)}
                          style={{ cursor: 'pointer' }}
                          className="hoverable-row"
                          title="Click para ver la imagen de esta orden"
                        >
                          <td><strong>#{order.id}</strong></td>
                          <td>{order.restaurante_nombre || 'N/A'}</td>
                          <td>${order.total?.toFixed(2) || '0.00'}</td>
                          <td>
                            <span className={`status-badge ${order.estado?.toLowerCase()}`}>
                              {order.estado}
                            </span>
                          </td>
                          <td>{new Date(order.fecha_pedido).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseUserOrdersModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Imagen de Orden */}
      {showImageModal && (
        <div className="modal-overlay" onClick={handleCloseImageModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Imagen de la Orden</h2>
              <button className="btn-close" onClick={handleCloseImageModal}>✕</button>
            </div>

            <div style={{ padding: '24px', textAlign: 'center' }}>
              {loadingImage ? (
                <div className="loading-state">
                  <div className="spinner-large"></div>
                  <p>Cargando imagen...</p>
                </div>
              ) : orderImageUrl ? (
                <div>
                  <img 
                    src={orderImageUrl} 
                    alt="Imagen de la orden" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '500px', 
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=Imagen+no+disponible'
                    }}
                  />
                  <p style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
                    <a href={orderImageUrl} target="_blank" rel="noopener noreferrer">
                      Abrir imagen en nueva pestaña ↗
                    </a>
                  </p>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🖼️</div>
                  <p>No hay imagen disponible para esta orden</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseImageModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard