import { useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { login, isAuthenticated, usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const from = location.state?.from?.pathname || '/'

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await login(username, password)
      const roles = res.user?.roles || []

      // Redirigir según rol
      if (roles.includes('ROLE_ADMIN')) {
        navigate('/admin')
      } else if (roles.includes('ROLE_VENDEDOR')) {
        navigate('/vendedor')
      } else {
        navigate(from === '/login' ? '/' : from)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error de autenticación. Verifica las credenciales.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (user, pass) => {
    setUsername(user)
    setPassword(pass)
    setLoading(true)
    setErrorMsg('')
    login(user, pass)
      .then((res) => {
        const roles = res.user?.roles || []
        if (roles.includes('ROLE_ADMIN')) {
          navigate('/admin')
        } else if (roles.includes('ROLE_VENDEDOR')) {
          navigate('/vendedor')
        } else {
          navigate('/')
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Credenciales inválidas')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  if (isAuthenticated) {
    return (
      <div className="py-5 text-center">
        <Card className="border-0 shadow-sm mx-auto p-4" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem' }}>👤</div>
          <h4 className="fw-bold mt-2">Sesión Activa</h4>
          <p className="text-muted">
            Has iniciado sesión como <strong>{usuario?.username}</strong> ({usuario?.roles?.join(', ')})
          </p>
          <div className="d-flex justify-content-center gap-2 mt-3">
            <Button variant="primary" onClick={() => navigate('/')}>
              Ir a la Tienda
            </Button>
            <Button variant="outline-danger" onClick={logout}>
              Cerrar Sesión
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="login-page py-5">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={5}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <img
                  src="/assets/img/logo.svg"
                  alt="Sonido Vivo"
                  height="45"
                  className="mb-3"
                />
                <h2 className="h4 fw-bold">Acceso a Sonido Vivo</h2>
                <p className="text-muted small">
                  Ingresa con tu cuenta o selecciona un rol de demostración.
                </p>
              </div>

              {errorMsg && (
                <Alert variant="danger" dismissible onClose={() => setErrorMsg('')}>
                  {errorMsg}
                </Alert>
              )}

              {/* Botones de Acceso Rápido / Demo */}
              <div className="mb-4 p-3 bg-light rounded border">
                <div className="small fw-bold text-muted mb-2 text-uppercase">
                  ⚡ Accesos Rápidos de Demostración:
                </div>
                <div className="d-grid gap-2">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="text-start d-flex justify-content-between align-items-center"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    disabled={loading}
                  >
                    <span>🛡️ Administrador (Full Control)</span>
                    <Badge bg="danger">admin / admin123</Badge>
                  </Button>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    className="text-start d-flex justify-content-between align-items-center text-dark"
                    onClick={() => handleQuickLogin('vendedor', 'vendedor123')}
                    disabled={loading}
                  >
                    <span>💼 Vendedor (POS & Stock)</span>
                    <Badge bg="warning" text="dark">
                      vendedor / vendedor123
                    </Badge>
                  </Button>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="text-start d-flex justify-content-between align-items-center"
                    onClick={() => handleQuickLogin('usuario', 'usuario123')}
                    disabled={loading}
                  >
                    <span>🛒 Cliente / Usuario (Compras)</span>
                    <Badge bg="primary">usuario / usuario123</Badge>
                  </Button>
                </div>
              </div>

              <Form onSubmit={handleLoginSubmit}>
                <Form.Group className="mb-3" controlId="loginUsername">
                  <Form.Label className="small fw-semibold">Usuario</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="admin, vendedor o usuario"
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="loginPassword">
                  <Form.Label className="small fw-semibold">Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Ingresa tu contraseña"
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 py-2 fw-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Validando con Spring Boot...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Login
