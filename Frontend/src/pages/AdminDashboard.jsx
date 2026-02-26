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
                      <tr key={user.id}>
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
    </div>
  )
}

export default AdminDashboard