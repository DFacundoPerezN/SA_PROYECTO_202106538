import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/api'
import '../styles/Auth.css'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    role: '',
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
      await authService.register(formData)
      
      // Redirigir al login con mensaje de éxito
      navigate('/login', { 
        state: { message: '¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.' }
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta. Intenta nuevamente.')
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
            <div className="logo-icon">🚀</div>
            <div className="logo-text">DeliveryApp</div>
          </div>

          <div className="brand-content">
            <h1>Únete a la revolución del delivery</h1>
            <p>Crea tu cuenta y comienza a disfrutar de entregas rápidas y seguras.</p>
          </div>

        </div>

        <div className="auth-section">
          <div className="auth-card">
            <div className="card-header">
              <h2>Crear Cuenta</h2>
              <p>Completa los datos para registrarte</p>
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="nombre_completo">
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="nombre_completo"
                  name="nombre_completo"
                  className="form-input"
                  placeholder="Nombre y Apellido"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  required
                />
              </div>

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
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="role">
                  Tipo de usuario
                </label>
                <select
                  id="role"
                  name="role"
                  className="form-input form-select"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="CLIENTE">Cliente</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span>Creando cuenta...</span>
                    <div className="spinner"></div>
                  </>
                ) : (
                  <span>Crear Cuenta</span>
                )}
              </button>
            </form>

            <div className="switch-view">
              ¿Ya tienes cuenta? <Link to="/login" className="switch-link">Inicia sesión aquí</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
