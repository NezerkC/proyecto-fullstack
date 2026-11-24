import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatearPrecioCLP } from '../data/productos'
import {
  ajustarStock,
  crearCliente,
  obtenerClientes,
  obtenerProductos,
  registrarVentaAdmin,
} from '../services/api'

const MOTIVOS_STOCK = [
  'INGRESO_PROVEEDOR',
  'VENTA_DIRECTA_MOSTRADOR',
  'DEVOLUCION_CLIENTE',
  'MERMA_AVERIA',
]

function VendedorPanel() {
  const { usuario, isVendedor, isAdmin, isAuthenticated } = useAuth()

  const [activeTab, setActiveTab] = useState('pos') // 'pos' | 'productos' | 'clientes'
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Datos
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])

  // Modal Ajuste Stock
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockAdjustment, setStockAdjustment] = useState({
    codigo: '',
    delta: 1,
    motivo: 'INGRESO_PROVEEDOR',
  })

  // Modal Nuevo Cliente Oracle
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    rut: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    commune: '',
    region: 'Valparaíso',
  })

  // Formulario Venta POS
  const [ventaPOS, setVentaPOS] = useState({
    customerId: '1',
    productCode: '',
    quantity: 1,
    unitPriceClp: 0,
  })
  const [ticketVenta, setTicketVenta] = useState(null)

  const cargarDatos = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const [prodsData, clientesData] = await Promise.allSettled([
        obtenerProductos(),
        obtenerClientes(),
      ])

      if (prodsData.status === 'fulfilled' && prodsData.value) {
        setProductos(prodsData.value)
        if (prodsData.value.length > 0 && !ventaPOS.productCode) {
          const primero = prodsData.value[0]
          setVentaPOS((prev) => ({
            ...prev,
            productCode: primero.codigo,
            unitPriceClp: primero.precio,
          }))
        }
      }

      if (clientesData.status === 'fulfilled' && clientesData.value) {
        setClientes(clientesData.value)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && (isVendedor || isAdmin)) {
      void cargarDatos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isVendedor, isAdmin])

  if (!isAuthenticated || (!isVendedor && !isAdmin)) {
    return (
      <div className="py-5 text-center">
        <Card className="border-0 shadow-sm mx-auto p-4" style={{ maxWidth: '450px' }}>
          <div style={{ fontSize: '3rem' }}>🚫</div>
          <h4 className="fw-bold mt-2">Acceso Denegado</h4>
          <p className="text-muted small">
            Se requiere el rol <code>ROLE_VENDEDOR</code> o <code>ROLE_ADMIN</code> para operar el
            terminal Punto de Venta.
          </p>
          <Link to="/login" className="btn btn-primary mt-2">
            Iniciar Sesión
          </Link>
        </Card>
      </div>
    )
  }

  const handleSeleccionarProductoPOS = (e) => {
    const cod = e.target.value
    const prod = productos.find((p) => p.codigo === cod)
    setVentaPOS((prev) => ({
      ...prev,
      productCode: cod,
      unitPriceClp: prod ? prod.precio : 0,
    }))
  }

  const handleEmitirVentaPOS = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await registrarVentaAdmin(ventaPOS)
      setTicketVenta(res)
      setSuccessMsg(`Venta registrada exitosamente. Referencia: ${res.saleReference}`)
      cargarDatos()
    } catch (err) {
      setErrorMsg(`Error al procesar venta: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAjustarStock = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      await ajustarStock(stockAdjustment.codigo, stockAdjustment.delta, stockAdjustment.motivo)
      setSuccessMsg(`Stock actualizado para ${stockAdjustment.codigo}`)
      setShowStockModal(false)
      cargarDatos()
    } catch (err) {
      setErrorMsg(`Error en ajuste de stock: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCrearCliente = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await crearCliente(nuevoCliente)
      setSuccessMsg(`Cliente ${res.fullName || res.firstName} registrado en Oracle.`)
      setShowClienteModal(false)
      setNuevoCliente({
        rut: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        commune: '',
        region: 'Valparaíso',
      })
      cargarDatos()
    } catch (err) {
      setErrorMsg(`Error registrando cliente: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="vendedor-panel py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">Terminal de Ventas & POS Mostrador</h1>
          <p className="text-muted small mb-0">
            Operador: <strong>{usuario?.username}</strong> ({usuario?.roles?.join(', ')})
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant={activeTab === 'pos' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setActiveTab('pos')}
          >
            🧾 Nueva Venta POS
          </Button>
          <Button
            variant={activeTab === 'productos' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setActiveTab('productos')}
          >
            📦 Inventario & Stock
          </Button>
          <Button
            variant={activeTab === 'clientes' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setActiveTab('clientes')}
          >
            👥 Clientes Oracle
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={cargarDatos} disabled={loading}>
            🔄 Sincronizar
          </Button>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {/* PESTAÑA 1: TERMINAL POS */}
      {activeTab === 'pos' && (
        <Row className="g-4">
          <Col xs={12} lg={7}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0 fw-bold">Emisión Directa de Venta en Mostrador</h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Form onSubmit={handleEmitirVentaPOS}>
                  <Row className="g-3">
                    <Col xs={12} sm={6}>
                      <Form.Group controlId="posCliente">
                        <Form.Label className="small fw-semibold">Cliente</Form.Label>
                        <Form.Select
                          value={ventaPOS.customerId}
                          onChange={(e) =>
                            setVentaPOS({ ...ventaPOS, customerId: e.target.value })
                          }
                          required
                        >
                          <option value="1">Cliente Mostrador General (ID: 1)</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.rut} - {c.fullName || `${c.firstName} ${c.lastName}`}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6}>
                      <Form.Group controlId="posProducto">
                        <Form.Label className="small fw-semibold">Producto del Inventario</Form.Label>
                        <Form.Select
                          value={ventaPOS.productCode}
                          onChange={handleSeleccionarProductoPOS}
                          required
                        >
                          {productos.map((p) => (
                            <option key={p.codigo} value={p.codigo}>
                              [{p.codigo}] {p.nombre} (Stock: {p.stock})
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6}>
                      <Form.Group controlId="posCantidad">
                        <Form.Label className="small fw-semibold">Cantidad</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          value={ventaPOS.quantity}
                          onChange={(e) =>
                            setVentaPOS({
                              ...ventaPOS,
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6}>
                      <Form.Group controlId="posPrecio">
                        <Form.Label className="small fw-semibold">Precio Unitario CLP</Form.Label>
                        <Form.Control
                          type="number"
                          min="1000"
                          value={ventaPOS.unitPriceClp}
                          onChange={(e) =>
                            setVentaPOS({
                              ...ventaPOS,
                              unitPriceClp: parseInt(e.target.value) || 0,
                            })
                          }
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="bg-light p-3 rounded my-3 d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">Total a Cobrar:</span>
                    <span className="fs-4 fw-bold text-primary">
                      {formatearPrecioCLP(ventaPOS.quantity * ventaPOS.unitPriceClp)}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="success"
                    size="lg"
                    className="w-100 fw-bold"
                    disabled={loading || !ventaPOS.productCode}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Registrando en Oracle PL/SQL...
                      </>
                    ) : (
                      '💵 Registrar Venta & Facturar'
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={5}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0 fw-bold">Último Ticket Generado</h5>
              </Card.Header>
              <Card.Body className="p-4">
                {ticketVenta ? (
                  <div className="ticket-box border p-3 rounded bg-light">
                    <div className="text-center border-bottom pb-2 mb-3">
                      <h6 className="fw-bold mb-0">SONIDO VIVO CHILE</h6>
                      <small className="text-muted">Boleta Electrónica de Venta</small>
                    </div>

                    <div className="small mb-3">
                      <div>
                        <strong>Ref:</strong> {ticketVenta.saleReference}
                      </div>
                      <div>
                        <strong>Cliente Oracle:</strong> {ticketVenta.customerId}
                      </div>
                      <div>
                        <strong>Producto:</strong> {ticketVenta.productCode}
                      </div>
                      <div>
                        <strong>Cantidad:</strong> {ticketVenta.quantity}
                      </div>
                      <div>
                        <strong>Total Bruto:</strong> {formatearPrecioCLP(ticketVenta.grossTotalClp)}
                      </div>
                      {ticketVenta.discountClp > 0 && (
                        <div className="text-success">
                          <strong>Descuento:</strong> -{formatearPrecioCLP(ticketVenta.discountClp)}
                        </div>
                      )}
                      <div className="fs-6 fw-bold text-primary mt-2">
                        Total Neto: {formatearPrecioCLP(ticketVenta.netTotalClp)}
                      </div>
                      <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                        Fecha: {new Date(ticketVenta.registeredAt).toLocaleString()}
                      </div>
                    </div>

                    <Button
                      variant="outline-dark"
                      size="sm"
                      className="w-100"
                      onClick={() => window.print()}
                    >
                      🖨️ Imprimir Ticket Mostrador
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <div style={{ fontSize: '2.5rem' }}>🎫</div>
                    <p className="mt-2 small">Aún no se ha emitido ninguna venta en esta sesión.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* PESTAÑA 2: INVENTARIO & STOCK */}
      {activeTab === 'productos' && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Inventario de Productos ({productos.length})</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th className="text-end">Precio</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr key={prod.codigo}>
                    <td>
                      <code className="fw-bold">{prod.codigo}</code>
                    </td>
                    <td>{prod.nombre}</td>
                    <td>
                      <Badge bg="light" text="dark" className="border">
                        {prod.categoria}
                      </Badge>
                    </td>
                    <td className="text-end fw-semibold">{formatearPrecioCLP(prod.precio)}</td>
                    <td className="text-center">
                      <Badge bg={prod.stock <= 0 ? 'danger' : prod.stock < 5 ? 'warning' : 'success'}>
                        {prod.stock}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setStockAdjustment({
                            codigo: prod.codigo,
                            delta: 1,
                            motivo: 'INGRESO_PROVEEDOR',
                          })
                          setShowStockModal(true)
                        }}
                      >
                        ⚡ Ajustar Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* PESTAÑA 3: CLIENTES ORACLE */}
      {activeTab === 'clientes' && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Clientes Registrados en Oracle DB ({clientes.length})</h5>
            <Button variant="success" size="sm" onClick={() => setShowClienteModal(true)}>
              + Nuevo Cliente Oracle
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>RUT</th>
                  <th>Nombre Completo</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Comuna / Región</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <code>{c.id}</code>
                    </td>
                    <td className="fw-bold">{c.rut}</td>
                    <td>{c.fullName || `${c.firstName} ${c.lastName}`}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td>
                      {c.commune}, {c.region}
                    </td>
                  </tr>
                ))}
                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No hay clientes registrados en Oracle todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* MODAL AJUSTE DE STOCK */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)}>
        <Form onSubmit={handleAjustarStock}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">Ajustar Stock: {stockAdjustment.codigo}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="stockDelta">
              <Form.Label>Variación de Unidades (Delta positivo o negativo)</Form.Label>
              <Form.Control
                type="number"
                value={stockAdjustment.delta}
                onChange={(e) =>
                  setStockAdjustment({
                    ...stockAdjustment,
                    delta: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
              <Form.Text className="text-muted">
                Ej: +10 para ingreso de proveedor, -2 para merma o avería.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="stockMotivo">
              <Form.Label>Motivo de Auditoría</Form.Label>
              <Form.Select
                value={stockAdjustment.motivo}
                onChange={(e) =>
                  setStockAdjustment({
                    ...stockAdjustment,
                    motivo: e.target.value,
                  })
                }
              >
                {MOTIVOS_STOCK.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStockModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              Guardar Ajuste
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL NUEVO CLIENTE ORACLE */}
      <Modal show={showClienteModal} onHide={() => setShowClienteModal(false)}>
        <Form onSubmit={handleCrearCliente}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">Registrar Cliente en Oracle</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-2">
              <Col xs={12}>
                <Form.Group controlId="clRut" className="mb-2">
                  <Form.Label className="small fw-semibold">RUT Chileno</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="12.345.678-9 o 12345678-9"
                    value={nuevoCliente.rut}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, rut: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="clNombre" className="mb-2">
                  <Form.Label className="small fw-semibold">Nombres</Form.Label>
                  <Form.Control
                    type="text"
                    value={nuevoCliente.firstName}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, firstName: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="clApellido" className="mb-2">
                  <Form.Label className="small fw-semibold">Apellidos</Form.Label>
                  <Form.Control
                    type="text"
                    value={nuevoCliente.lastName}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, lastName: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="clEmail" className="mb-2">
                  <Form.Label className="small fw-semibold">Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="clFono" className="mb-2">
                  <Form.Label className="small fw-semibold">Teléfono</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="+56912345678"
                    value={nuevoCliente.phone}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, phone: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="clComuna" className="mb-2">
                  <Form.Label className="small fw-semibold">Comuna</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Viña del Mar"
                    value={nuevoCliente.commune}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, commune: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowClienteModal(false)}>
              Cancelar
            </Button>
            <Button variant="success" type="submit" disabled={loading}>
              Guardar en Oracle
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default VendedorPanel
