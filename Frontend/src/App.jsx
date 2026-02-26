import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import ClienteDashboard from './pages/ClienteDashboard'
import ClienteOrders from './pages/ClienteOrders'
import RestaurantMenu from './pages/RestaurantMenu'
import ProtectedRoute from './components/ProtectedRoute'
import RestaurantDashboard from './pages/RestaurantDashboard'
import DriverDashboard from './pages/DriverDashborad'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ADMINISTRADOR']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/cliente/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['CLIENTE']}>
              <ClienteDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/cliente/orders" 
          element={
            <ProtectedRoute allowedRoles={['CLIENTE']}>
              <ClienteOrders />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/cliente/restaurant/:restaurantId/menu" 
          element={
            <ProtectedRoute allowedRoles={['CLIENTE']}>
              <RestaurantMenu />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/restaurante/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['RESTAURANTE']}>
              <RestaurantDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/repartidor/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['REPARTIDOR']}>
              <DriverDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
