import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, promocionService } from '../services/api'
import api from '../services/api'
import '../styles/Dashboard.css'

// Helpers
const isVigente = (p) => p.activa && new Date(p.fecha_fin) >= new Date()

const getBestPromo = (promos) => {
  if (!promos || promos.length === 0) return null
  const vigentes = promos.filter(isVigente)
  if (vigentes.length === 0) return null
  // Prioridad: ENVIO_GRATIS primero, luego mayor porcentaje
  const envioGratis = vigentes.find(p => p.tipo === 'ENVIO_GRATIS')
  if (envioGratis) return envioGratis
  return vigentes.reduce((best, p) => p.valor > best.valor ? p : best, vigentes[0])
}

const PromoBadge = ({ promo }) => {
  if (!promo) return null
  const isEnvio = promo.tipo === 'ENVIO_GRATIS'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: isEnvio
        ? 'linear-gradient(135deg, #1565c0, #0d47a1)'
        : 'linear-gradient(135deg, #e65100, #ff6b35)',
      color: '#fff', borderRadius: '6px', padding: '3px 10px',
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.3px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {isEnvio ? '🚚 ENVÍO GRATIS' : `🏷️ ${promo.valor}% OFF`}
    </div>
  )
}

const ClienteDashboard = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Mapa restauranteId → mejor promo vigente
  const [promoMap, setPromoMap] = useState({})
  const [promoLoading, setPromoLoading] = useState(false)

  useEffect(() => { fetchRestaurants() }, [])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/restaurants')
      const list = response.data.restaurants || []
      setRestaurants(list)
      setError('')
      if (list.length > 0) fetchAllPromociones(list)
    } catch (err) {
      setError('Error al cargar los restaurantes')
    } finally {
      setLoading(false)
    }
  }

  // Carga todas las promociones activas en una sola petición y las distribuye por restaurante
  const fetchAllPromociones = async (list) => {
    setPromoLoading(true)
    try {
      const result = await promocionService.getAll({ solo_activas: true })
      const all = result.promociones || []

      // Agrupar por restaurante_id
      const map = {}
      for (const p of all) {
        if (!isVigente(p)) continue
        const rid = p.restaurante_id
        if (!map[rid]) map[rid] = []
        map[rid].push(p)
      }
      setPromoMap(map)
    } catch (err) {
      console.warn('No se pudieron cargar las promociones:', err)
    } finally {
      setPromoLoading(false)
    }
  }

  const handleLogout = () => { authService.logout(); navigate('/login') }

  const handleViewMenu = (restaurant) => {
    localStorage.setItem('currentRestaurant', JSON.stringify({
      id: restaurant.id,
      nombre: restaurant.nombre,
      direccion: restaurant.direccion,
      telefono: restaurant.telefono,
      calificacion: restaurant.calificacion,
    }))
    // Guardar las promociones activas del restaurante para el menú
    const promos = promoMap[restaurant.id] || []
    localStorage.setItem(`promos_${restaurant.id}`, JSON.stringify(promos.filter(isVigente)))
    navigate(`/cliente/restaurant/${restaurant.id}/menu`)
  }

  const filteredRestaurants = restaurants.filter(r =>
    r.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Restaurantes con al menos una promo activa (para la sección especial)
  const conPromos = filteredRestaurants.filter(r => (promoMap[r.id] || []).some(isVigente))

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="logo-icon">🚀</div>
          <div className="logo-text">DeliveryApp</div>
        </div>
        <div className="nav-user">
          <button 
            onClick={() => navigate('/cliente/orders')}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
             Mis Órdenes
          </button>
          <button
            onClick={() => navigate('/cliente/ratings')}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #0891b2, #0e7490)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
             Calificaciones
          </button>
          <button
            onClick={() => navigate('/cliente/top-restaurants')}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
             Top 3
          </button>
          <div className="user-info">
            <span className="user-name">{user?.nombre_completo}</span>
            <span className="user-role">Cliente</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>¡Bienvenido de nuevo!</h1>
          <p>Hola, {user?.nombre_completo}. ¿Qué te gustaría pedir hoy?</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
                onClick={() => navigate('/cliente/orders')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.2)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.3)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.2)'
                }}
              >
                📋 Ver Mis Órdenes
              </button>
              <button
                onClick={() => navigate('/cliente/ratings')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(8, 145, 178, 0.25)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(8, 145, 178, 0.35)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(8, 145, 178, 0.25)'
                }}
              >
                ⭐ Ir a Calificaciones
              </button>
              <button
                onClick={() => navigate('/cliente/top-restaurants')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.26)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.38)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.26)'
                }}
              >
                🏆 Ver Top 3
              </button>
        </div>
        <div className="search-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Buscar restaurantes, comida o bebidas..." className="search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {/* ── Sección: Promociones destacadas ── */}
        {!promoLoading && conPromos.length > 0 && (
          <div className="restaurants-section" style={{ marginBottom: '2rem' }}>
            <h2 style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              🔥 <span>Ofertas y Promociones</span>
              <span style={{ fontSize:'0.8rem', fontWeight:400, color:'var(--text-secondary)', marginLeft:'4px' }}>
                — {conPromos.length} restaurante{conPromos.length > 1 ? 's' : ''} con descuentos activos
              </span>
            </h2>
            <div className="restaurants-grid">
              {conPromos.map(restaurant => {
                const promos = (promoMap[restaurant.id] || []).filter(isVigente)
                const best = getBestPromo(promos)
                return (
                  <div key={`promo-${restaurant.id}`} className="restaurant-card" style={{ borderColor:'var(--primary)', boxShadow:'0 4px 18px rgba(255,107,53,0.13)' }}>
                    <div className="restaurant-image" style={{ position:'relative' }}>
                      {restaurant.imagen_url
                        ? <img src={restaurant.imagen_url} alt={restaurant.nombre} />
                        : <div className="restaurant-placeholder">🍽️</div>
                      }
                      {/* Cinta de descuento */}
                      <div style={{ position:'absolute', top:'10px', right:'10px' }}>
                        <PromoBadge promo={best} />
                      </div>
                    </div>
                    <div className="restaurant-info">
                      <h3>{restaurant.nombre}</h3>
                      <div className="restaurant-meta">
                        {restaurant.calificacion && <><span>⭐ {restaurant.calificacion.toFixed(1)}</span><span>•</span></>}
                        <span className="status-badge active">Abierto</span>
                      </div>

                      {/* Lista de promos vigentes */}
                      <div style={{ margin:'8px 0', display:'flex', flexDirection:'column', gap:'4px' }}>
                        {promos.map(p => (
                          <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.82rem', color:'var(--text-secondary)' }}>
                            <span style={{ fontSize:'0.7rem', background: p.tipo === 'ENVIO_GRATIS' ? 'rgba(21,101,192,0.15)' : 'rgba(255,107,53,0.12)', color: p.tipo === 'ENVIO_GRATIS' ? '#90caf9' : 'var(--primary)', padding:'1px 6px', borderRadius:'4px', fontWeight:600 }}>
                              {p.tipo === 'ENVIO_GRATIS' ? '🚚' : `${p.valor}%`}
                            </span>
                            {p.titulo}
                          </div>
                        ))}
                      </div>

                      {restaurant.direccion && <p className="restaurant-address">📍 {restaurant.direccion}</p>}
                      <button className="btn-view-menu" onClick={() => handleViewMenu(restaurant)}>Ver Menú con Oferta</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Sección: Todos los restaurantes ── */}
        <div className="restaurants-section">
          <h2>Restaurantes Disponibles</h2>

          {error && <div className="alert alert-error" style={{ marginBottom:'20px' }}>{error}</div>}

          {loading ? (
            <div className="loading-state"><div className="spinner-large"></div><p>Cargando restaurantes...</p></div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <p>No se encontraron restaurantes</p>
              <small>{searchTerm ? 'Intenta con otro término de búsqueda' : 'No hay restaurantes disponibles en este momento'}</small>
            </div>
          ) : (
            <div className="restaurants-grid">
              {filteredRestaurants.map(restaurant => {
                const promos = (promoMap[restaurant.id] || []).filter(isVigente)
                const best = getBestPromo(promos)
                return (
                  <div key={restaurant.id} className="restaurant-card">
                    <div className="restaurant-image" style={{ position:'relative' }}>
                      {restaurant.imagen_url ? <img src={restaurant.imagen_url} alt={restaurant.nombre} /> : <div className="restaurant-placeholder">🍽️</div>}
                      {best && (
                        <div style={{ position:'absolute', top:'10px', right:'10px' }}>
                          <PromoBadge promo={best} />
                        </div>
                      )}
                    </div>
                    <div className="restaurant-info">
                      <h3>{restaurant.nombre}</h3>
                      <div className="restaurant-meta">
                        {restaurant.calificacion && <><span>⭐ {restaurant.calificacion.toFixed(1)}</span><span>•</span></>}
                        {restaurant.tiempo_entrega && <><span>{restaurant.tiempo_entrega} min</span><span>•</span></>}
                        <span className={`status-badge ${restaurant.activo ? 'active' : 'inactive'}`}>{restaurant.activo ? 'Abierto' : 'Cerrado'}</span>
                      </div>
                      {restaurant.descripcion && <p className="restaurant-description">{restaurant.descripcion}</p>}
                      {restaurant.direccion && <p className="restaurant-address">📍 {restaurant.direccion}</p>}

                      {/* Mini promo list */}
                      {promos.length > 0 && (
                        <div style={{ margin:'6px 0 10px', display:'flex', flexWrap:'wrap', gap:'4px' }}>
                          {promos.map(p => (
                            <span key={p.id} style={{ fontSize:'0.72rem', background: p.tipo === 'ENVIO_GRATIS' ? 'rgba(21,101,192,0.15)' : 'rgba(255,107,53,0.12)', color: p.tipo === 'ENVIO_GRATIS' ? '#90caf9' : 'var(--primary)', padding:'2px 8px', borderRadius:'20px', fontWeight:600, border:`1px solid ${p.tipo === 'ENVIO_GRATIS' ? 'rgba(21,101,192,0.3)' : 'rgba(255,107,53,0.25)'}` }}>
                              {p.tipo === 'ENVIO_GRATIS' ? '🚚 Envío gratis' : `🏷️ ${p.valor}% OFF`}
                            </span>
                          ))}
                        </div>
                      )}

                      <button className="btn-view-menu" onClick={() => handleViewMenu(restaurant)} disabled={!restaurant.activo}>
                        {restaurant.activo ? (best ? '🔥 Ver Menú con Oferta' : 'Ver Menú') : 'No disponible'}
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

export default ClienteDashboard
