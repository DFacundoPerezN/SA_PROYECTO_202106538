import { Navigate } from 'react-router-dom'
import { authService } from '../services/api'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = authService.isAuthenticated()
  const user = authService.getCurrentUser()

  //console.log('ProtectedRoute - User:', user)
  //console.log('ProtectedRoute - Allowed roles:', allowedRoles)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirigir según el rol del usuario
    console.log('Rol no permitido. Redirigiendo...')
    
    if (user?.role === 'ADMIN' || user?.role === 'ADMINISTRADOR') {
      return <Navigate to="/admin/dashboard" replace />
    } else if (user?.role === 'RESTAURANTE') {
      return <Navigate to="/restaurante/dashboard" replace />
    } else if (user?.role === 'CLIENTE') {
      return <Navigate to="/cliente/dashboard" replace />
    } else if (user?.role === 'REPARTIDOR') {
      return <Navigate to="/repartidor/dashboard" replace />
    }
    
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
