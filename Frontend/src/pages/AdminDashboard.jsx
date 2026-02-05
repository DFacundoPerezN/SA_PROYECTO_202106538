import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import '../styles/Dashboard.css'

const AdminDashboard = () => {
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
          <p>Bienvenido, {user?.nombre_completo}</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>Total Pedidos</h3>
              <p className="stat-value">1,234</p>
              <span className="stat-change positive">+12% vs mes anterior</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>Clientes Activos</h3>
              <p className="stat-value">567</p>
              <span className="stat-change positive">+8% vs mes anterior</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🚚</div>
            <div className="stat-info">
              <h3>Repartidores</h3>
              <p className="stat-value">42</p>
              <span className="stat-change neutral">Sin cambios</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>Ingresos Mensuales</h3>
              <p className="stat-value">$45,678</p>
              <span className="stat-change positive">+15% vs mes anterior</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Pedidos Recientes</h2>
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No hay pedidos recientes</p>
              <small>Los pedidos aparecerán aquí cuando sean realizados</small>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Actividad del Sistema</h2>
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>Sin actividad reciente</p>
              <small>La actividad del sistema se mostrará aquí</small>
            </div>
          </div>
        </div>

        <div className="action-cards">
          <div className="action-card">
            <div className="action-icon">👤</div>
            <h3>Gestionar Usuarios</h3>
            <p>Administrar clientes y repartidores</p>
            <button className="btn-action">Ver usuarios</button>
          </div>

          <div className="action-card">
            <div className="action-icon">🍔</div>
            <h3>Gestionar Productos</h3>
            <p>Catálogo de productos y restaurantes</p>
            <button className="btn-action">Ver productos</button>
          </div>

          <div className="action-card">
            <div className="action-icon">⚙️</div>
            <h3>Configuración</h3>
            <p>Ajustes generales del sistema</p>
            <button className="btn-action">Configurar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
