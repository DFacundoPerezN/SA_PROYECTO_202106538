import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/api'
import '../styles/Auth.css'

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await authService.login(formData.email, formData.password)
      
      // Guardar token y usuario
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirigir según el rol
      if (data.user.role === 'ADMINISTRADOR') {
        navigate('/admin/dashboard')
      } else {
        navigate('/cliente/dashboard')
      }
    } catch (err) {
      console.error(err)
      console.log(err.response)
      setError(err.response?.data?.error || error || 'Error al iniciar sesión. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="auth-wrapper">
        <div className="brand-section">
          <div className="logo">
            <div className="logo-icon">🍴</div>
            <div className="logo-text">DeliveryApp</div>
          </div>

          <div className="brand-content">
            <h1>Bienvenido a la nueva era de deliveries</h1>
            <p>Conectamos clientes con los mejores servicios de entrega. Rápido, seguro y confiable.</p>

          </div>
        </div>

        <div className="auth-section">
          <div className="auth-card">
            <div className="card-header">
              <h2>Iniciar Sesión</h2>
              <p>Ingresa tus credenciales para continuar</p>
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span>Iniciando sesión...</span>
                    <div className="spinner"></div>
                  </>
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>
            </form>

            <div className="switch-view">
              ¿No tienes cuenta? <Link to="/register" className="switch-link">Regístrate aquí</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
