import { Navigate } from 'react-router-dom'
import { authService } from '../services/api'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = authService.isAuthenticated()
  const user = authService.getCurrentUser()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Si el usuario no tiene el rol permitido, redirigir a su dashboard
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />
    } else {
      return <Navigate to="/cliente/dashboard" replace />
    }
  }

  return children
}

export default ProtectedRoute
