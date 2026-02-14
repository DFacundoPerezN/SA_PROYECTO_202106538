import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import api from '../services/api'
import '../styles/Dashboard.css'

const ClienteDashboard = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()
  
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/restaurants')
      setRestaurants(response.data.restaurants || [])
      setError('')
    } catch (err) {
      console.error('Error fetching restaurants:', err)
      setError('Error al cargar los restaurantes')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

const handleViewMenu = (restaurant) => {
  // Guardar info del restaurante en localStorage
  localStorage.setItem('currentRestaurant', JSON.stringify({
    id: restaurant.id,
    nombre: restaurant.nombre,
    direccion: restaurant.direccion,
    telefono: restaurant.telefono,
    calificacion: restaurant.calificacion
  }))
  
  navigate(`/cliente/restaurant/${restaurant.id}/menu`)
}

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="logo-icon">🚀</div>
          <div className="logo-text">DeliveryApp</div>
        </div>
        <div className="nav-user">
          <div className="user-info">
            <span className="user-name">{user?.nombre_completo}</span>
            <span className="user-role">Cliente</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>¡Bienvenido de nuevo!</h1>
          <p>Hola, {user?.nombre_completo}. ¿Qué te gustaría pedir hoy?</p>
        </div>

        <div className="search-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar restaurantes, comida o bebidas..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>


        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Mis Pedidos</h2>
            <div className="empty-state">
              <div className="empty-icon">🛍️</div>
              <p>No tienes pedidos aún</p>
              <small>Realiza tu primer pedido y aparecerá aquí</small>
              <button className="btn-action" style={{ marginTop: '16px' }}>
                Explorar Restaurantes
              </button>
            </div>
          </div>
        </div>

        <div className="restaurants-section">
          <h2>Restaurantes Disponibles</h2>
          
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Cargando restaurantes...</p>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <p>No se encontraron restaurantes</p>
              <small>
                {searchTerm 
                  ? 'Intenta con otro término de búsqueda' 
                  : 'No hay restaurantes disponibles en este momento'}
              </small>
            </div>
          ) : (
            <div className="restaurants-grid">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="restaurant-card">
                  <div className="restaurant-image">
                    {restaurant.imagen_url ? (
                      <img src={restaurant.imagen_url} alt={restaurant.nombre} />
                    ) : (
                      <div className="restaurant-placeholder">🍽️</div>
                    )}
                  </div>
                  <div className="restaurant-info">
                    <h3>{restaurant.nombre}</h3>
                    
                    <div className="restaurant-meta">
                      {restaurant.calificacion && (
                        <>
                          <span>⭐ {restaurant.calificacion.toFixed(1)}</span>
                          <span>•</span>
                        </>
                      )}
                      {restaurant.tiempo_entrega && (
                        <>
                          <span>{restaurant.tiempo_entrega} min</span>
                          <span>•</span>
                        </>
                      )}
                      <span className={`status-badge ${restaurant.activo ? 'active' : 'inactive'}`}>
                        {restaurant.activo ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                    
                    {restaurant.descripcion && (
                      <p className="restaurant-description">{restaurant.descripcion}</p>
                    )}

                    {restaurant.direccion && (
                      <p className="restaurant-address">📍 {restaurant.direccion}</p>
                    )}
                    
                    <button 
                      className="btn-view-menu"
                      onClick={() => handleViewMenu(restaurant)}
                      disabled={!restaurant.activo}
                    >
                      {restaurant.activo ? 'Ver Menú' : 'No disponible'}
                    </button>
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

export default ClienteDashboard
