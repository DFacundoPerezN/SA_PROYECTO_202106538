import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import '../styles/Dashboard.css'

const ClienteDashboard = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

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
            />
          </div>
        </div>

        <div className="categories-section">
          <h2>Categorías Populares</h2>
          <div className="categories-grid">
            <div className="category-card">
              <div className="category-icon">🍕</div>
              <span>Pizza</span>
            </div>
            <div className="category-card">
              <div className="category-icon">🍔</div>
              <span>Hamburguesas</span>
            </div>
            <div className="category-card">
              <div className="category-icon">🍣</div>
              <span>Sushi</span>
            </div>
            <div className="category-card">
              <div className="category-icon">🌮</div>
              <span>Mexicana</span>
            </div>
            <div className="category-card">
              <div className="category-icon">🍝</div>
              <span>Italiana</span>
            </div>
            <div className="category-card">
              <div className="category-icon">🥗</div>
              <span>Saludable</span>
            </div>
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

          <div className="dashboard-card">
            <h2>Favoritos</h2>
            <div className="empty-state">
              <div className="empty-icon">❤️</div>
              <p>No tienes favoritos guardados</p>
              <small>Guarda tus restaurantes favoritos para acceder rápidamente</small>
            </div>
          </div>
        </div>

        <div className="restaurants-section">
          <h2>Restaurantes Recomendados</h2>
          <div className="restaurants-grid">
            <div className="restaurant-card">
              <div className="restaurant-image">🍕</div>
              <div className="restaurant-info">
                <h3>Pizza Palace</h3>
                <div className="restaurant-meta">
                  <span>⭐ 4.8</span>
                  <span>•</span>
                  <span>25-35 min</span>
                  <span>•</span>
                  <span>$$</span>
                </div>
                <p className="restaurant-description">Pizza artesanal italiana</p>
              </div>
            </div>

            <div className="restaurant-card">
              <div className="restaurant-image">🍔</div>
              <div className="restaurant-info">
                <h3>Burger King</h3>
                <div className="restaurant-meta">
                  <span>⭐ 4.5</span>
                  <span>•</span>
                  <span>15-25 min</span>
                  <span>•</span>
                  <span>$</span>
                </div>
                <p className="restaurant-description">Hamburguesas clásicas</p>
              </div>
            </div>

            <div className="restaurant-card">
              <div className="restaurant-image">🍣</div>
              <div className="restaurant-info">
                <h3>Sushi Master</h3>
                <div className="restaurant-meta">
                  <span>⭐ 4.9</span>
                  <span>•</span>
                  <span>30-40 min</span>
                  <span>•</span>
                  <span>$$$</span>
                </div>
                <p className="restaurant-description">Sushi fresco y auténtico</p>
              </div>
            </div>

            <div className="restaurant-card">
              <div className="restaurant-image">🌮</div>
              <div className="restaurant-info">
                <h3>Taco Fiesta</h3>
                <div className="restaurant-meta">
                  <span>⭐ 4.7</span>
                  <span>•</span>
                  <span>20-30 min</span>
                  <span>•</span>
                  <span>$$</span>
                </div>
                <p className="restaurant-description">Tacos mexicanos auténticos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClienteDashboard
