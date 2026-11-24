import { Container } from 'react-bootstrap'
import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Navigation from './components/Navbar'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import AdminPanel from './pages/AdminPanel'
import Blogs from './pages/Blogs'
import Carrito from './pages/Carrito'
import Checkout from './pages/Checkout'
import Contacto from './pages/Contacto'
import Home from './pages/Home'
import Login from './pages/Login'
import Nosotros from './pages/Nosotros'
import Productos from './pages/Productos'
import VendedorPanel from './pages/VendedorPanel'

function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function ProtectedVendedorRoute({ children }) {
  const { isAuthenticated, isVendedor, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isVendedor && !isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navigation />

      <Container as="main" className="page-content flex-grow-1 py-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/:id" element={<Blogs />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/vendedor"
            element={
              <ProtectedVendedorRoute>
                <VendedorPanel />
              </ProtectedVendedorRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminPanel />
              </ProtectedAdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>

      <Footer />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </AuthProvider>
  )
}

export default App
