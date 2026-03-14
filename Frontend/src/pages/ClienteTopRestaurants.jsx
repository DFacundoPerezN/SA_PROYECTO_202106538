import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { authService } from '../services/api'
import '../styles/Dashboard.css'

const podiumByRank = {
  1: { badge: '🥇', title: 'Oro', shadow: '0 10px 24px rgba(255, 193, 7, 0.28)' },
  2: { badge: '🥈', title: 'Plata', shadow: '0 10px 24px rgba(148, 163, 184, 0.3)' },
  3: { badge: '🥉', title: 'Bronce', shadow: '0 10px 24px rgba(249, 115, 22, 0.22)' },
}

const formatRating = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 'N/A'
  }

  return parsed.toFixed(1)
}

const ClienteTopRestaurants = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTopRestaurants = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/api/restaurants/top?n=3')
      const list = Array.isArray(response.data)
        ? response.data
        : response?.data?.restaurants || []

      setRestaurants(list.slice(0, 3))
    } catch (err) {
      console.error('Error al cargar top restaurantes:', err)
      setError('No se pudo cargar el top de restaurantes')
      setRestaurants([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopRestaurants()
  }, [])

  const handleViewMenu = (restaurant) => {
    localStorage.setItem(
      'currentRestaurant',
      JSON.stringify({
        id: restaurant.id,
        nombre: restaurant.nombre,
        direccion: restaurant.direccion,
        telefono: restaurant.telefono,
        calificacion: restaurant.calificacion,
      })
    )

    localStorage.setItem(`promos_${restaurant.id}`, JSON.stringify([]))
    navigate(`/cliente/restaurant/${restaurant.id}/menu`)
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="logo-icon">🏆</div>
          <div className="logo-text">Top Restaurantes</div>
        </div>

        <div className="nav-user">
          <button
            onClick={() => navigate('/cliente/dashboard')}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Volver
          </button>
          <div className="user-info">
            <span className="user-name">{user?.nombre_completo || user?.email}</span>
            <span className="user-role">Cliente</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section" style={{ marginBottom: '1.5rem' }}>
          <h1>Top 3 Restaurantes Mejor Calificados</h1>
          <p>Estos son los restaurantes con mejor puntuación promedio en este momento.</p>
        </div>

        <div className="restaurants-section">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Cargando ranking...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏁</div>
              <p>Aún no hay restaurantes para mostrar</p>
              <small>Intenta de nuevo en unos minutos</small>
            </div>
          ) : (
            <div className="restaurants-grid">
              {restaurants.map((restaurant, index) => {
                const rank = index + 1
                const rankMeta = podiumByRank[rank] || podiumByRank[3]

                return (
                  <div
                    key={restaurant.id || rank}
                    className="restaurant-card"
                    style={{ boxShadow: rankMeta.shadow, border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="restaurant-image" style={{ position: 'relative' }}>
                      {restaurant.imagen_url ? (
                        <img src={restaurant.imagen_url} alt={restaurant.nombre} />
                      ) : (
                        <div className="restaurant-placeholder">🍽️</div>
                      )}

                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderRadius: '999px',
                          background: 'rgba(15, 23, 42, 0.85)',
                          color: '#fff',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                        }}
                      >
                        <span>{rankMeta.badge}</span>
                        <span>#{rank} {rankMeta.title}</span>
                      </div>
                    </div>

                    <div className="restaurant-info">
                      <h3>{restaurant.nombre || `Restaurante #${restaurant.id}`}</h3>
                      <div className="restaurant-meta">
                        <span>⭐ {formatRating(restaurant.calificacion)}</span>
                        <span>•</span>
                        <span className="status-badge active">Top {rank}</span>
                      </div>

                      {restaurant.direccion && (
                        <p className="restaurant-address">📍 {restaurant.direccion}</p>
                      )}

                      <button className="btn-view-menu" onClick={() => handleViewMenu(restaurant)}>
                        Ver Menú
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClienteTopRestaurants
