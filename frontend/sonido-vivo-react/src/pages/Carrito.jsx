import { Alert, Button, Card, Col, Form, ListGroup, Row } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatearPrecioCLP, obtenerRutaImagen } from '../data/productos'

function Carrito() {
  const { cartItems, totalAmount, totalItems, updateQuantity, removeFromCart, clearCart } =
    useCart()
  const navigate = useNavigate()

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-5">
        <div style={{ fontSize: '4rem' }}>🛒</div>
        <h2 className="h4 fw-bold mt-3">Tu carrito está vacío</h2>
        <p className="text-muted">Parece que aún no has agregado instrumentos a tu orden.</p>
        <Link to="/productos" className="btn btn-primary mt-2">
          Explorar Catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="cart-page py-4">
      <h1 className="h3 fw-bold mb-4">Carro de Compras</h1>

      <Row className="g-4">
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Artículos ({totalItems})</span>
              <Button variant="link" size="sm" className="text-danger p-0" onClick={clearCart}>
                Vaciar Carrito
              </Button>
            </Card.Header>
            <ListGroup variant="flush">
              {cartItems.map((item) => {
                const imgPath = obtenerRutaImagen(item)
                const stockMax = item.stock ?? 99

                return (
                  <ListGroup.Item key={item.codigo} className="p-3">
                    <Row className="align-items-center g-3">
                      <Col xs={3} sm={2} className="text-center">
                        <div
                          className="bg-light rounded p-1 d-flex align-items-center justify-content-center"
                          style={{ height: '70px', width: '70px', margin: '0 auto' }}
                        >
                          {imgPath ? (
                            <img
                              src={imgPath}
                              alt={item.nombre}
                              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <span>🎵</span>
                          )}
                        </div>
                      </Col>

                      <Col xs={9} sm={4}>
                        <h6 className="mb-0 fw-bold">{item.nombre}</h6>
                        <small className="text-muted d-block">Cód: {item.codigo}</small>
                        <small className="text-muted">{item.categoria}</small>
                      </Col>

                      <Col xs={6} sm={3}>
                        <div className="d-flex align-items-center gap-1">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            style={{ width: '30px', height: '30px', padding: 0 }}
                            onClick={() => updateQuantity(item.codigo, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <Form.Control
                            type="number"
                            min="1"
                            max={stockMax}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.codigo, parseInt(e.target.value) || 1)
                            }
                            className="text-center"
                            style={{ width: '50px', height: '30px', padding: '0 4px' }}
                          />
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            style={{ width: '30px', height: '30px', padding: 0 }}
                            disabled={item.quantity >= stockMax}
                            onClick={() => updateQuantity(item.codigo, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Disp: {stockMax}
                        </small>
                      </Col>

                      <Col xs={4} sm={2} className="text-end">
                        <div className="fw-bold text-primary">
                          {formatearPrecioCLP(item.precio * item.quantity)}
                        </div>
                        <small className="text-muted d-block">
                          {formatearPrecioCLP(item.precio)} c/u
                        </small>
                      </Col>

                      <Col xs={2} sm={1} className="text-end">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="border-0"
                          onClick={() => removeFromCart(item.codigo)}
                          title="Eliminar producto"
                        >
                          ✕
                        </Button>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                )
              })}
            </ListGroup>
          </Card>
        </Col>

        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Resumen de Compra</h5>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal</span>
                <span>{formatearPrecioCLP(totalAmount)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Envío</span>
                <span className="text-success fw-semibold">Gratis</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">IVA (19% incluido)</span>
                <span>{formatearPrecioCLP(Math.round(totalAmount * 0.19))}</span>
              </div>

              <hr />

              <div className="d-flex justify-content-between mb-4">
                <span className="fw-bold fs-5">Total a Pagar</span>
                <span className="fw-bold fs-5 text-primary">
                  {formatearPrecioCLP(totalAmount)}
                </span>
              </div>

              <Alert variant="info" className="small py-2 mb-3">
                💳 Pago seguro con integración bancaria y facturación Oracle PL/SQL.
              </Alert>

              <Button
                variant="primary"
                size="lg"
                className="w-100"
                onClick={() => navigate('/checkout')}
              >
                Proceder al Checkout →
              </Button>

              <div className="text-center mt-3">
                <Link to="/productos" className="text-muted small text-decoration-none">
                  ← Seguir comprando
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Carrito
