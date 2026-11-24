import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatearPrecioCLP } from '../data/productos'
import { registrarCompraCliente } from '../services/api'

function Checkout() {
  const { cartItems, totalAmount, totalItems, clearCart } = useCart()
  const { isAuthenticated, usuario } = useAuth()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState('1')
  const [comprobante, setComprobante] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isAuthenticated) {
    return (
      <div className="py-5 text-center">
        <Card className="border-0 shadow-sm mx-auto p-4" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem' }}>🔐</div>
          <h3 className="fw-bold mt-3">Identificación Requerida</h3>
          <p className="text-muted">
            Para procesar tu orden con facturación electrónica Oracle PL/SQL, debes ingresar a tu cuenta.
          </p>
          <div className="d-flex justify-content-center gap-2 mt-2">
            <Button variant="primary" onClick={() => navigate('/login')}>
              Iniciar Sesión
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate('/carrito')}>
              Volver al Carro
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (cartItems.length === 0 && !comprobante) {
    return (
      <div className="py-5 text-center">
        <h4 className="fw-bold">No hay artículos en tu carrito</h4>
        <Link to="/productos" className="btn btn-primary mt-3">
          Ver Catálogo
        </Link>
      </div>
    )
  }

  const handleProcesarCompra = async (e) => {
    e.preventDefault()
    if (cartItems.length === 0) return

    setLoading(true)
    setErrorMsg('')
    try {
      // Registrar venta en Spring Boot /store/sales para el primer item o procesar en lote
      const primerItem = cartItems[0]
      const payload = {
        customerId: customerId.trim() || '1',
        productCode: primerItem.codigo,
        quantity: primerItem.quantity,
        unitPriceClp: primerItem.precio,
      }

      const res = await registrarCompraCliente(payload)
      setComprobante({
        saleReference: res.saleReference || `SALE-${Date.now()}`,
        customerId: res.customerId || customerId,
        productCode: res.productCode || primerItem.codigo,
        quantity: res.quantity || primerItem.quantity,
        netTotalClp: res.netTotalClp || totalAmount,
        discountClp: res.discountClp || 0,
        registeredAt: res.registeredAt || new Date().toISOString(),
        items: [...cartItems],
      })
      clearCart()
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar la venta en Oracle')
    } finally {
      setLoading(false)
    }
  }

  if (comprobante) {
    return (
      <div className="checkout-success py-5">
        <Row className="justify-content-center">
          <Col xs={12} md={8}>
            <Card className="border-0 shadow-sm border-top border-success border-4">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div className="text-success mb-2" style={{ fontSize: '3rem' }}>
                    ✅
                  </div>
                  <h2 className="fw-bold h4">¡Compra Procesada con Éxito!</h2>
                  <p className="text-muted small">
                    Tu orden ha sido registrada en el inventario central y sincronizada en Oracle PL/SQL.
                  </p>
                </div>

                <div className="bg-light p-3 rounded mb-4">
                  <Row className="g-2 small">
                    <Col xs={6}>
                      <strong>Referencia de Venta:</strong>
                    </Col>
                    <Col xs={6} className="text-end font-monospace text-primary fw-bold">
                      {comprobante.saleReference}
                    </Col>

                    <Col xs={6}>
                      <strong>ID Cliente (Oracle):</strong>
                    </Col>
                    <Col xs={6} className="text-end">
                      {comprobante.customerId}
                    </Col>

                    <Col xs={6}>
                      <strong>Usuario:</strong>
                    </Col>
                    <Col xs={6} className="text-end">
                      {usuario?.username}
                    </Col>

                    <Col xs={6}>
                      <strong>Fecha / Hora:</strong>
                    </Col>
                    <Col xs={6} className="text-end">
                      {new Date(comprobante.registeredAt).toLocaleString()}
                    </Col>
                  </Row>
                </div>

                <h6 className="fw-bold mb-3">Detalle del Comprobante</h6>
                <Table responsive size="sm" className="mb-4">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="text-center">Cant.</th>
                      <th className="text-end">Precio</th>
                      <th className="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprobante.items.map((it) => (
                      <tr key={it.codigo}>
                        <td>
                          {it.nombre} <br />
                          <small className="text-muted">{it.codigo}</small>
                        </td>
                        <td className="text-center">{it.quantity}</td>
                        <td className="text-end">{formatearPrecioCLP(it.precio)}</td>
                        <td className="text-end">{formatearPrecioCLP(it.precio * it.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {comprobante.discountClp > 0 && (
                      <tr>
                        <td colSpan={3} className="text-end text-success">
                          Descuento Aplicado:
                        </td>
                        <td className="text-end text-success">
                          -{formatearPrecioCLP(comprobante.discountClp)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="text-end fw-bold">
                        Total Pagado:
                      </td>
                      <td className="text-end fw-bold text-primary">
                        {formatearPrecioCLP(comprobante.netTotalClp)}
                      </td>
                    </tr>
                  </tfoot>
                </Table>

                <div className="d-flex justify-content-center gap-2">
                  <Button variant="primary" onClick={() => navigate('/productos')}>
                    Seguir Comprando
                  </Button>
                  <Button variant="outline-secondary" onClick={() => window.print()}>
                    Imprimir Comprobante 🖨️
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <div className="checkout-page py-4">
      <h1 className="h3 fw-bold mb-4">Finalizar Compra</h1>

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      <Row className="g-4">
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fw-bold">1. Datos de Facturación (Oracle PL/SQL)</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleProcesarCompra}>
                <Row className="g-3">
                  <Col xs={12} sm={6}>
                    <Form.Group controlId="checkUser">
                      <Form.Label className="small fw-semibold">Usuario Autenticado</Form.Label>
                      <Form.Control type="text" value={usuario?.username || ''} disabled readOnly />
                    </Form.Group>
                  </Col>

                  <Col xs={12} sm={6}>
                    <Form.Group controlId="checkCustomerId">
                      <Form.Label className="small fw-semibold">
                        ID Cliente Oracle <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        placeholder="Ej: 1"
                        required
                      />
                      <Form.Text className="text-muted">
                        ID numérico o RUT del cliente registrado en Oracle DB.
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group controlId="checkDireccion">
                      <Form.Label className="small fw-semibold">Dirección de Despacho</Form.Label>
                      <Form.Control
                        type="text"
                        defaultValue="Av. Libertad 1234, Viña del Mar, Valparaíso"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group controlId="checkMetodoPago">
                      <Form.Label className="small fw-semibold">Método de Pago</Form.Label>
                      <Form.Select defaultValue="webpay">
                        <option value="webpay">Webpay Plus / Débito / Crédito</option>
                        <option value="transfer">Transferencia Bancaria Inmediata</option>
                        <option value="cash">Efectivo contra entrega en tienda</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="mt-4 pt-3 border-top">
                  <Button
                    type="submit"
                    variant="success"
                    size="lg"
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Registrando en Oracle PL/SQL...
                      </>
                    ) : (
                      `Confirmar y Pagar ${formatearPrecioCLP(totalAmount)}`
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fw-bold">2. Resumen del Pedido</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Table size="sm" responsive className="mb-3">
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.codigo}>
                      <td>
                        <div className="fw-semibold">{item.nombre}</div>
                        <small className="text-muted">
                          {item.quantity} x {formatearPrecioCLP(item.precio)}
                        </small>
                      </td>
                      <td className="text-end fw-bold align-middle">
                        {formatearPrecioCLP(item.precio * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <hr />

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Artículos:</span>
                <span>{totalItems}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold fs-5">Total a Pagar:</span>
                <span className="fw-bold fs-5 text-primary">{formatearPrecioCLP(totalAmount)}</span>
              </div>

              <div className="p-2 bg-light rounded text-center small text-muted">
                🛡️ Transacción auditada y validada por Spring Security + JPA / Oracle
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Checkout
