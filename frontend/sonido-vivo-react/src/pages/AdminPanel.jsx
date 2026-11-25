import { useEffect, useState } from 'react'
import {
  Alert,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
} from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatearPrecioCLP } from '../data/productos'
import {
  actualizarCliente,
  actualizarProducto,
  ajustarStock,
  calcularDescuento,
  cambiarEstadoProducto,
  crearCliente,
  crearProducto,
  descargarReporteMetricas,
  descontinuarProducto,
  ejecutarLiquidacion,
  obtenerClientes,
  obtenerMetricas,
  obtenerProductos,
  reajustarPrecios,
} from '../services/api'

const CATEGORIAS_VALIDAS = [
  'Cuerdas',
  'Audio Pro',
  'Percusion',
  'Teclados',
  'Vientos',
  'Accesorios',
]

const MOTIVOS_AJUSTE = [
  'INGRESO_PROVEEDOR',
  'VENTA_DIRECTA_MOSTRADOR',
  'DEVOLUCION_CLIENTE',
  'MERMA_AVERIA',
]

function AdminPanel() {
  const { usuario, isAdmin, isAuthenticated } = useAuth()

  const [activeTab, setActiveTab] = useState('kpis') // 'kpis' | 'productos' | 'reajuste' | 'clientes' | 'liquidaciones'
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Dashboard Data
  const [metrics, setMetrics] = useState(null)
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [exporting, setExporting] = useState(false)

  // Modal Alta / Edición Producto
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditingProduct, setIsEditingProduct] = useState(false)
  const [productModalError, setProductModalError] = useState('')
  const [prodForm, setProdForm] = useState({
    codigo: '',
    nombre: '',
    categoria: 'Cuerdas',
    precioClp: '',
    stockDisponible: '',
    tags: '',
  })

  // Modal Ajuste de Stock
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockModalError, setStockModalError] = useState('')
  const [stockAdjustment, setStockAdjustment] = useState({
    codigo: '',
    delta: '1',
    motivo: 'INGRESO_PROVEEDOR',
  })

  // Modal Reajuste de Precios
  const [reajusteForm, setReajusteForm] = useState({
    porcentaje: '5.0',
    categoria: '',
    motivo: 'Ajuste inflacionario semestral',
  })

  // Modal Alta / Edición Cliente Oracle
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [isEditingCliente, setIsEditingCliente] = useState(false)
  const [clienteModalError, setClienteModalError] = useState('')
  const [clienteForm, setClienteForm] = useState({
    id: '',
    rut: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    commune: '',
    region: 'Valparaíso',
  })

  // Tab Liquidaciones Oracle
  const [processDate, setProcessDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [liquidationResult, setLiquidationResult] = useState(null)
  const [liquidationLoading, setLiquidationLoading] = useState(false)
  const [liquidationError, setLiquidationError] = useState('')

  // Previsualización Descuento
  const [discountCustomerId, setDiscountCustomerId] = useState('')
  const [discountGrossClp, setDiscountGrossClp] = useState('100000')
  const [discountPreview, setDiscountPreview] = useState(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState('')

  const cargarDatosAdmin = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const [prodsData, metricsData, clientesData] = await Promise.allSettled([
        obtenerProductos({ size: 100 }),
        obtenerMetricas(),
        obtenerClientes(),
      ])

      if (prodsData.status === 'fulfilled' && prodsData.value) {
        setProductos(prodsData.value)
      }

      if (metricsData.status === 'fulfilled' && metricsData.value) {
        setMetrics(metricsData.value)
      }

      if (clientesData.status === 'fulfilled' && clientesData.value) {
        setClientes(clientesData.value)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error cargando datos administrativos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      void cargarDatosAdmin()
    }
  }, [isAuthenticated, isAdmin])

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="py-5 text-center">
        <div className="p-4 bg-white rounded border mx-auto shadow-sm" style={{ maxWidth: '450px' }}>
          <div style={{ fontSize: '3rem' }}>🔐</div>
          <h4 className="fw-bold mt-2">Área Restringida</h4>
          <p className="text-muted small">
            Debes iniciar sesión con rol <code>ROLE_ADMIN</code> para acceder al panel de
            administración y gobernanza.
          </p>
          <Link to="/login" className="btn btn-primary mt-2">
            Iniciar Sesión como Admin
          </Link>
        </div>
      </div>
    )
  }

  const handleOpenCreateProduct = () => {
    setIsEditingProduct(false)
    setProductModalError('')
    setProdForm({
      codigo: '',
      nombre: '',
      categoria: 'Cuerdas',
      precioClp: '',
      stockDisponible: '',
      tags: '',
    })
    setShowProductModal(true)
  }

  const handleOpenEditProduct = (prod) => {
    setIsEditingProduct(true)
    setProductModalError('')
    setProdForm({
      codigo: prod.codigo,
      nombre: prod.nombre,
      categoria: prod.categoria,
      precioClp: prod.precio,
      stockDisponible: prod.stock,
      tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : '',
    })
    setShowProductModal(true)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setProductModalError('')
    setSuccessMsg('')
    try {
      const tagsArray = prodForm.tags
        ? prodForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []

      if (isEditingProduct) {
        await actualizarProducto(prodForm.codigo, {
          nombre: prodForm.nombre,
          categoria: prodForm.categoria,
          precioClp: Number(prodForm.precioClp),
          stockDisponible: Number(prodForm.stockDisponible),
          tags: tagsArray,
        })
        setSuccessMsg(`Producto ${prodForm.codigo} actualizado exitosamente.`)
      } else {
        await crearProducto({
          codigo: prodForm.codigo,
          nombre: prodForm.nombre,
          categoria: prodForm.categoria,
          precioClp: Number(prodForm.precioClp),
          stockDisponible: Number(prodForm.stockDisponible),
          tags: tagsArray,
        })
        setSuccessMsg(`Producto ${prodForm.codigo} creado en MongoDB.`)
      }
      setShowProductModal(false)
      cargarDatosAdmin()
    } catch (err) {
      setProductModalError(err.message || 'Error con producto')
    } finally {
      setLoading(false)
    }
  }

  const handleAjustarStock = async (e) => {
    e.preventDefault()
    const rawDelta = String(stockAdjustment.delta ?? '').trim()
    const parsedDelta = /^-?\d+$/.test(rawDelta) ? Number.parseInt(rawDelta, 10) : Number.NaN
    if (!Number.isInteger(parsedDelta) || parsedDelta === 0) {
      setStockModalError('La variación de stock debe ser un entero distinto de 0.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    setStockModalError('')
    setSuccessMsg('')
    try {
      await ajustarStock(stockAdjustment.codigo, parsedDelta, stockAdjustment.motivo)
      const deltaLabel = parsedDelta > 0 ? `+${parsedDelta}` : String(parsedDelta)
      setSuccessMsg(`Stock de ${stockAdjustment.codigo} ajustado (${deltaLabel}).`)
      setShowStockModal(false)
      cargarDatosAdmin()
    } catch (err) {
      setStockModalError(`Error al ajustar stock: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivar = async (prod) => {
    const nuevoEstado = (prod.stock || 0) > 0 ? 'ACTIVO' : 'AGOTADO'
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      await cambiarEstadoProducto(prod.codigo, nuevoEstado)
      setSuccessMsg(`Producto ${prod.codigo} reactivado (${nuevoEstado}).`)
      cargarDatosAdmin()
    } catch (err) {
      setErrorMsg(`Error al reactivar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDescontinuar = async (codigo) => {
    if (!window.confirm(`¿Seguro que deseas descontinuar el producto ${codigo}?`)) {
      return
    }
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      await descontinuarProducto(codigo)
      setSuccessMsg(`Producto ${codigo} descontinuado con éxito.`)
      cargarDatosAdmin()
    } catch (err) {
      setErrorMsg(`Error al descontinuar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReajustePrecios = async (e) => {
    e.preventDefault()
    const pct = Number(reajusteForm.porcentaje)
    if (!Number.isFinite(pct) || pct === 0 || pct < -50 || pct > 100) {
      setErrorMsg('El porcentaje de reajuste debe ser un número entre -50 y 100 (distinto de 0).')
      return
    }
    if (!window.confirm(`¿Aplicar ajuste masivo de ${pct}% a los precios?`)) {
      return
    }
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await reajustarPrecios(
        pct,
        reajusteForm.categoria || null,
        reajusteForm.motivo
      )
      setSuccessMsg(
        `Reajuste masivo completado. Registros actualizados: ${res.updatedCount ?? res.affected ?? 'Varios'}.`
      )
      cargarDatosAdmin()
    } catch (err) {
      setErrorMsg(`Error en reajuste masivo: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreateCliente = () => {
    setIsEditingCliente(false)
    setClienteModalError('')
    setClienteForm({
      id: '',
      rut: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      commune: '',
      region: 'Valparaíso',
    })
    setShowClienteModal(true)
  }

  const handleOpenEditCliente = (c) => {
    setIsEditingCliente(true)
    setClienteModalError('')
    setClienteForm({
      id: c.id,
      rut: c.rut,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      commune: c.commune,
      region: c.region,
    })
    setShowClienteModal(true)
  }

  const handleSaveCliente = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setClienteModalError('')
    setSuccessMsg('')
    try {
      if (isEditingCliente) {
        await actualizarCliente(clienteForm.id, clienteForm)
        setSuccessMsg(`Cliente ${clienteForm.rut} actualizado en Oracle DB.`)
      } else {
        await crearCliente(clienteForm)
        setSuccessMsg(`Cliente ${clienteForm.rut} registrado en Oracle DB.`)
      }
      setShowClienteModal(false)
      cargarDatosAdmin()
    } catch (err) {
      setClienteModalError(err.message || 'Error al guardar cliente en Oracle')
    } finally {
      setLoading(false)
    }
  }

  const handleExportMetrics = async (format) => {
    setExporting(true)
    setErrorMsg('')
    try {
      const { blob, filename } = await descargarReporteMetricas(format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setSuccessMsg(`Reporte ${filename} descargado exitosamente.`)
    } catch (err) {
      setErrorMsg(`Error al exportar métricas (${format}): ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const handleEjecutarLiquidacion = async (e) => {
    e.preventDefault()
    setLiquidationLoading(true)
    setLiquidationError('')
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const result = await ejecutarLiquidacion(processDate)
      setLiquidationResult(result)
      setSuccessMsg(`Liquidación completada: ${result.processedCustomers} clientes procesados.`)
    } catch (err) {
      setLiquidationError(err.message || 'Error al ejecutar liquidación Oracle')
    } finally {
      setLiquidationLoading(false)
    }
  }

  const handleCalcularDescuento = async (e) => {
    e.preventDefault()
    const trimmedId = String(discountCustomerId).trim()
    const gross = Number(discountGrossClp)
    if (!trimmedId) {
      setDiscountError('Ingresa un ID de cliente Oracle válido.')
      return
    }
    if (!Number.isFinite(gross) || gross <= 0) {
      setDiscountError('El monto bruto debe ser mayor a 0 CLP.')
      return
    }
    setDiscountLoading(true)
    setDiscountError('')
    try {
      const res = await calcularDescuento(trimmedId, gross)
      setDiscountPreview({
        customerId: trimmedId,
        grossAmountClp: gross,
        discountClp: res.discountClp ?? 0,
        netAmountClp: gross - (res.discountClp ?? 0),
      })
    } catch (err) {
      setDiscountError(err.message || 'Error al calcular descuento')
    } finally {
      setDiscountLoading(false)
    }
  }

  // Cálculos derivados
  const totalStockUnidades =
    metrics?.kpis?.unidadesTotales ??
    metrics?.totalUnitsInStock ??
    productos.reduce((acc, p) => acc + (p.stock || 0), 0)
  const valorTotalInventario =
    metrics?.kpis?.capitalTotalEnBodega ??
    metrics?.totalInventoryValueClp ??
    productos.reduce((acc, p) => acc + (p.precio || 0) * (p.stock || 0), 0)
  const categoriasActivasCount =
    metrics?.kpis?.categoriasActivas ??
    new Set(productos.map((p) => p.categoria)).size
  const productosCriticos = productos.filter(
    (p) => p.estado !== 'DESCONTINUADO' && (p.stock || 0) < 5
  )

  return (
    <div className="admin-dashboard-page">
      {/* Top Admin Header Strip */}
      <div className="admin-header p-3 rounded mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 text-white">
        <div className="d-flex align-items-center gap-3">
          <span className="badge-admin">PANEL ADMIN</span>
          <span className="admin-user-tag">
            👤 {usuario?.username} &bull; MongoDB + Oracle
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={cargarDatosAdmin}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" className="me-1" /> : '🔄'} Recargar
          </button>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="mb-4">
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="mb-4">
          {successMsg}
        </Alert>
      )}

      {/* Admin Layout: 2 Columnas (Sidebar + Main) */}
      <div className="admin-layout">
        {/* Sidebar de Gestión */}
        <aside className="admin-sidebar" aria-label="Navegación del panel de gestión">
          <div className="admin-sidebar-header">
            <h3 className="h5 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Menú de Gestión
            </h3>
            <small className="text-muted">Administración General</small>
          </div>

          <nav className="admin-nav">
            <ul className="list-unstyled mb-0">
              <li>
                <button
                  type="button"
                  className={`btn w-100 text-start border-0 ${activeTab === 'kpis' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('kpis')}
                >
                  📊 Dashboard General
                </button>
              </li>
              <li className="mt-2">
                <button
                  type="button"
                  className={`btn w-100 text-start border-0 ${activeTab === 'productos' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('productos')}
                >
                  📦 Mantenedor Productos
                </button>
              </li>
              <li className="mt-2">
                <button
                  type="button"
                  className={`btn w-100 text-start border-0 ${activeTab === 'reajuste' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('reajuste')}
                >
                  📈 Reajuste de Precios
                </button>
              </li>
              <li className="mt-2">
                <button
                  type="button"
                  className={`btn w-100 text-start border-0 ${activeTab === 'clientes' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('clientes')}
                >
                  👥 Clientes Oracle
                </button>
              </li>
              <li className="mt-2">
                <button
                  type="button"
                  className={`btn w-100 text-start border-0 ${activeTab === 'liquidaciones' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('liquidaciones')}
                >
                  ⚖️ Liquidaciones Oracle
                </button>
              </li>
              <li className="mt-3 pt-3 border-top">
                <Link to="/" className="btn btn-outline-primary btn-sm w-100 text-center">
                  🏪 Ver Tienda Pública
                </Link>
              </li>
            </ul>
          </nav>

          <div className="admin-sidebar-info mt-4 pt-3 border-top">
            <small className="text-muted d-block mb-1">
              <strong>Sucursal:</strong>
            </small>
            <span className="small text-dark fw-bold">Viña del Mar Central (Casa Matriz)</span>
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className="admin-main">
          {/* TAB 1: KPIS & DASHBOARD GENERAL */}
          {activeTab === 'kpis' && (
            <div className="kpis-section">
              <header className="section-header mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h1 className="h3 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    Resumen Operativo del Negocio
                  </h1>
                  <p className="text-muted small mb-0">
                    Supervisión en vivo de stock, catálogo comercial y usuarios registrados en MongoDB y Oracle.
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={exporting}
                    onClick={() => handleExportMetrics('csv')}
                  >
                    📥 Exportar CSV
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={exporting}
                    onClick={() => handleExportMetrics('pdf')}
                  >
                    📄 Exportar PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={exporting}
                    onClick={() => handleExportMetrics('json')}
                  >
                    📋 Exportar JSON
                  </button>
                </div>
              </header>

              {/* Stats Grid */}
              <div className="stats-grid mb-4">
                <div className="stat-card">
                  <div className="stat-icon">🎸</div>
                  <div className="stat-info">
                    <span className="small text-muted text-uppercase fw-bold">Instrumentos</span>
                    <div className="stat-number tabular-nums">{productos.length}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-info">
                    <span className="small text-muted text-uppercase fw-bold">Stock Crítico (&lt; 5)</span>
                    <div className="stat-number tabular-nums" style={{ color: 'var(--color-danger)' }}>
                      {productosCriticos.length}
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📦</div>
                  <div className="stat-info">
                    <span className="small text-muted text-uppercase fw-bold">Unidades Totales</span>
                    <div className="stat-number tabular-nums">{totalStockUnidades}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <span className="small text-muted text-uppercase fw-bold">Clientes Oracle</span>
                    <div className="stat-number tabular-nums">{clientes.length}</div>
                  </div>
                </div>
              </div>

              {/* Valoración de Inventario */}
              <div className="admin-valuation-card mb-4">
                <div>
                  <h3 className="h5 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    Valor Total de Bodega (CLP):
                  </h3>
                  <p className="text-muted small mb-0">
                    Suma del costo comercial multiplicado por el stock disponible en bodega central.
                  </p>
                </div>
                <div
                  className="admin-valuation-amount tabular-nums fs-2 fw-bold"
                  style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}
                >
                  {formatearPrecioCLP(valorTotalInventario)}
                </div>
              </div>

              {/* Desglose por Categoría */}
              {Array.isArray(metrics?.desglosePorCategoria) && metrics.desglosePorCategoria.length > 0 ? (
                <section className="mb-4" aria-label="Desglose por categoría">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h5 mb-0" style={{ fontFamily: 'var(--font-heading)' }}>
                      Desglose por Categoría (Aggregation Pipeline)
                    </h2>
                    <span className="badge badge-category">
                      {categoriasActivasCount} categorías activas
                    </span>
                  </div>
                  <div className="data-table-wrapper" tabIndex={0} role="region" aria-label="Tabla de categorías">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Categoría</th>
                          <th className="text-center">Unidades</th>
                          <th className="text-end">Precio Promedio</th>
                          <th className="text-end">Valor Inventario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.desglosePorCategoria.map((item) => (
                          <tr key={item.categoria}>
                            <td className="fw-semibold">
                              <span className="badge badge-category">{item.categoria}</span>
                            </td>
                            <td className="text-center tabular-nums">{item.total_unidades}</td>
                            <td className="text-end tabular-nums">
                              {formatearPrecioCLP(Math.round(item.precio_promedio || 0))}
                            </td>
                            <td
                              className="text-end fw-bold tabular-nums"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {formatearPrecioCLP(item.valor_total_inventario || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : metrics?.categoryBreakdown && Object.keys(metrics.categoryBreakdown).length > 0 ? (
                <section className="mb-4" aria-label="Desglose por categoría">
                  <h2 className="h5 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    Desglose por Categoría (Aggregation Pipeline)
                  </h2>
                  <div className="data-table-wrapper" tabIndex={0} role="region" aria-label="Tabla de categorías">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Categoría</th>
                          <th className="text-center">Items</th>
                          <th className="text-center">Unidades</th>
                          <th className="text-end">Valor Inventario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(metrics.categoryBreakdown).map(([cat, data]) => (
                          <tr key={cat}>
                            <td className="fw-semibold">
                              <span className="badge badge-category">{cat}</span>
                            </td>
                            <td className="text-center tabular-nums">{data.count ?? data.totalProducts ?? '-'}</td>
                            <td className="text-center tabular-nums">{data.totalStock ?? data.units ?? '-'}</td>
                            <td
                              className="text-end fw-bold tabular-nums"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {formatearPrecioCLP(data.totalValueClp ?? data.value ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {/* Tabla de Alertas de Stock Crítico */}
              <section aria-label="Alertas de reposición urgente">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0" style={{ fontFamily: 'var(--font-heading)' }}>
                    Instrumentos que Requieren Reposición Urgente
                  </h2>
                  <span className="badge badge-critical">{productosCriticos.length} items</span>
                </div>

                <div className="data-table-wrapper" tabIndex={0} role="region" aria-label="Tabla de stock crítico">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th className="text-end">Precio CLP</th>
                        <th className="text-center">Stock Actual</th>
                        <th className="text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosCriticos.map((prod) => (
                        <tr key={prod.codigo}>
                          <td className="text-nowrap">
                            <code>{prod.codigo}</code>
                          </td>
                          <td className="fw-semibold">{prod.nombre}</td>
                          <td>
                            <span className="badge badge-category">{prod.categoria}</span>
                          </td>
                          <td className="text-end tabular-nums">{formatearPrecioCLP(prod.precio)}</td>
                          <td className="text-center">
                            <span className="badge badge-critical tabular-nums">
                              {prod.stock <= 0 ? 'AGOTADO (0)' : `${prod.stock} un.`}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-outline btn-sm py-1 px-2"
                              onClick={() => {
                                setStockModalError('')
                                setStockAdjustment({
                                  codigo: prod.codigo,
                                  delta: '5',
                                  motivo: 'INGRESO_PROVEEDOR',
                                })
                                setShowStockModal(true)
                              }}
                            >
                              ⚡ Reponer +5
                            </button>
                          </td>
                        </tr>
                      ))}
                      {productosCriticos.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">
                            🎉 Todos los productos cuentan con stock suficiente en bodega.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: CRUD PRODUCTOS */}
          {activeTab === 'productos' && (
            <div className="productos-crud-section">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h1 className="h3 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    Catálogo de Productos ({productos.length})
                  </h1>
                  <p className="text-muted small mb-0">
                    Administración directa de documentos en colección MongoDB <code>sonido_vivo_nosql.productos</code>.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenCreateProduct}
                >
                  + Crear Producto
                </button>
              </div>

              <div className="data-table-wrapper" tabIndex={0} role="region" aria-label="Tabla de mantenedor de productos">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th className="text-end">Precio CLP</th>
                      <th className="text-center">Stock</th>
                      <th className="text-center">Estado</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((prod) => (
                      <tr key={prod.codigo}>
                        <td className="text-nowrap">
                          <code>{prod.codigo}</code>
                        </td>
                        <td className="fw-semibold">{prod.nombre}</td>
                        <td>
                          <span className="badge badge-category">{prod.categoria}</span>
                        </td>
                        <td className="text-end tabular-nums fw-semibold">{formatearPrecioCLP(prod.precio)}</td>
                        <td className="text-center">
                          <span
                            className={`badge tabular-nums ${
                              prod.stock <= 0
                                ? 'badge-danger'
                                : prod.stock < 5
                                  ? 'badge-critical'
                                  : 'badge-ok'
                            }`}
                          >
                            {prod.stock}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge ${
                              prod.estado === 'DESCONTINUADO'
                                ? 'badge-danger'
                                : prod.estado === 'AGOTADO'
                                  ? 'badge-critical'
                                  : 'badge-ok'
                            }`}
                          >
                            {prod.estado || 'ACTIVO'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm py-1 px-2"
                              onClick={() => handleOpenEditProduct(prod)}
                              title="Editar producto"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm py-1 px-2"
                              onClick={() => {
                                setStockModalError('')
                                setStockAdjustment({
                                  codigo: prod.codigo,
                                  delta: '1',
                                  motivo: 'INGRESO_PROVEEDOR',
                                })
                                setShowStockModal(true)
                              }}
                              title={prod.estado === 'DESCONTINUADO' ? 'Producto descontinuado: reactívalo antes de ajustar stock' : 'Ajustar stock'}
                              disabled={prod.estado === 'DESCONTINUADO'}
                            >
                              ⚡
                            </button>
                            {prod.estado === 'DESCONTINUADO' ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm py-1 px-2 text-success"
                                onClick={() => handleReactivar(prod)}
                                title="Reactivar producto"
                                disabled={loading}
                              >
                                ♻️
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm py-1 px-2 text-danger"
                                onClick={() => handleDescontinuar(prod.codigo)}
                                title="Descontinuar producto"
                                disabled={loading}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REAJUSTE DE PRECIOS */}
          {activeTab === 'reajuste' && (
            <div className="reajuste-section">
              <header className="section-header mb-4">
                <h1 className="h3 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  Reajuste Masivo de Precios (Auditoría)
                </h1>
                <p className="text-muted small">
                  Aplica un cambio porcentual a todos los precios de una categoría o del catálogo completo.
                  Esta operación queda registrada con trazabilidad en auditoría.
                </p>
              </header>

              <div className="form-card mx-auto p-4 bg-white rounded border" style={{ maxWidth: '600px' }}>
                <Form onSubmit={handleReajustePrecios}>
                  <Form.Group className="mb-3" controlId="reajPorcentaje">
                    <Form.Label className="small fw-semibold">
                      Porcentaje de Reajuste (%)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="0.1"
                      min="-50"
                      max="100"
                      value={reajusteForm.porcentaje}
                      onChange={(e) =>
                        setReajusteForm({
                          ...reajusteForm,
                          porcentaje: e.target.value,
                        })
                      }
                      required
                    />
                    <Form.Text className="text-muted">
                      Valores positivos aumentan (ej: 5.0), valores negativos descuentan (ej: -10.0, máx -50%).
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="reajCategoria">
                    <Form.Label className="small fw-semibold">
                      Categoría Objetivo (Opcional)
                    </Form.Label>
                    <Form.Select
                      value={reajusteForm.categoria}
                      onChange={(e) =>
                        setReajusteForm({ ...reajusteForm, categoria: e.target.value })
                      }
                    >
                      <option value="">Todas las Categorías (Catálogo Completo)</option>
                      {CATEGORIAS_VALIDAS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="reajMotivo">
                    <Form.Label className="small fw-semibold">Motivo de Auditoría</Form.Label>
                    <Form.Control
                      type="text"
                      value={reajusteForm.motivo}
                      onChange={(e) =>
                        setReajusteForm({ ...reajusteForm, motivo: e.target.value })
                      }
                      placeholder="Ej: Ajuste por inflación semestral"
                      required
                    />
                  </Form.Group>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 fw-bold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Aplicando Reajuste...
                      </>
                    ) : (
                      '⚡ Aplicar Reajuste Masivo'
                    )}
                  </button>
                </Form>
              </div>
            </div>
          )}

          {/* TAB 4: CLIENTES ORACLE */}
          {activeTab === 'clientes' && (
            <div className="clientes-section">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h1 className="h3 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    Gestión de Clientes Oracle DB ({clientes.length})
                  </h1>
                  <p className="text-muted small mb-0">
                    Sincronización directa con tabla relacional Oracle <code>SONIDO_VIVO.CLIENTE</code>.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenCreateCliente}
                >
                  + Nuevo Cliente
                </button>
              </div>

              <div className="data-table-wrapper" tabIndex={0} role="region" aria-label="Tabla de clientes Oracle">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>RUT</th>
                      <th>Nombre Completo</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Comuna / Región</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <code>{c.id}</code>
                        </td>
                        <td className="fw-bold text-nowrap tabular-nums">{c.rut}</td>
                        <td>{c.fullName || `${c.firstName} ${c.lastName}`}</td>
                        <td>{c.email}</td>
                        <td>{c.phone}</td>
                        <td>
                          {c.commune}, {c.region}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm py-1 px-2"
                            onClick={() => handleOpenEditCliente(c)}
                            title="Editar cliente"
                          >
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {clientes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          No hay clientes registrados en Oracle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: LIQUIDACIONES ORACLE */}
          {activeTab === 'liquidaciones' && (
            <div className="liquidaciones-section">
              <header className="section-header mb-4">
                <h1 className="h3 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  Liquidaciones Oracle (PL/SQL)
                </h1>
                <p className="text-muted small">
                  Ejecución del procedimiento almacenado <code>PKG_SONIDO_VIVO.SP_LIQUIDAR_CLIENTES</code> y
                  simulación de descuentos por cliente.
                </p>
              </header>

              {liquidationError && (
                <Alert variant="danger" dismissible onClose={() => setLiquidationError('')} className="mb-4">
                  {liquidationError}
                </Alert>
              )}

              <Row className="g-4 mb-4">
                {/* Formulario de Liquidación */}
                <Col xs={12} lg={6}>
                  <div className="p-4 bg-white rounded border h-100 shadow-sm">
                    <h4 className="h5 fw-bold mb-3">1. Ejecutar Proceso de Liquidación</h4>
                    <p className="text-muted small mb-3">
                      Liquida las operaciones de clientes en Oracle DB para la fecha indicada (o el día de hoy si no se especifica).
                    </p>
                    <Form onSubmit={handleEjecutarLiquidacion}>
                      <Form.Group className="mb-3" controlId="admLiqProcessDate">
                        <Form.Label className="small fw-semibold">Fecha de Proceso</Form.Label>
                        <Form.Control
                          type="date"
                          value={processDate}
                          onChange={(e) => setProcessDate(e.target.value)}
                          required
                        />
                        <Form.Text className="text-muted">
                          Formato YYYY-MM-DD. Ejecuta <code>PKG_SONIDO_VIVO.SP_LIQUIDAR_CLIENTES</code>.
                        </Form.Text>
                      </Form.Group>

                      <button
                        type="submit"
                        className="btn btn-primary w-100 fw-bold"
                        disabled={liquidationLoading}
                      >
                        {liquidationLoading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Ejecutando en Oracle...
                          </>
                        ) : (
                          '⚖️ Ejecutar Liquidación Oracle'
                        )}
                      </button>
                    </Form>

                    {liquidationResult && (
                      <div className="mt-4 p-3 bg-light rounded border">
                        <h5 className="h6 fw-bold mb-2 text-success">✓ Resultado de Liquidación</h5>
                        <ul className="list-unstyled mb-0 small">
                          <li className="mb-1">
                            <strong>Fecha de Proceso:</strong>{' '}
                            <span className="tabular-nums">{liquidationResult.processDate}</span>
                          </li>
                          <li className="mb-1">
                            <strong>Clientes Procesados:</strong>{' '}
                            <span className="badge badge-ok tabular-nums">{liquidationResult.processedCustomers}</span>
                          </li>
                          <li className="mb-1">
                            <strong>Total Liquidado:</strong>{' '}
                            <span className="fw-bold text-primary tabular-nums">
                              {formatearPrecioCLP(liquidationResult.totalLiquidatedClp)}
                            </span>
                          </li>
                          <li>
                            <strong>Mensaje / Estado:</strong>{' '}
                            <code>{liquidationResult.statusMessage}</code>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </Col>

                {/* Previsualización de Descuento */}
                <Col xs={12} lg={6}>
                  <div className="p-4 bg-white rounded border h-100 shadow-sm">
                    <h4 className="h5 fw-bold mb-3">2. Previsualizar Descuento Estimado</h4>
                    <p className="text-muted small mb-3">
                      Calcula el descuento aplicable a un cliente para un monto bruto según las reglas PL/SQL (<code>FN_CALCULAR_DESCUENTO</code>).
                    </p>
                    {discountError && (
                      <Alert variant="danger" dismissible onClose={() => setDiscountError('')} className="py-2 small">
                        {discountError}
                      </Alert>
                    )}
                    <Form onSubmit={handleCalcularDescuento}>
                      <Form.Group className="mb-3" controlId="admDiscCustomerId">
                        <Form.Label className="small fw-semibold">ID Cliente Oracle</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Ej: 1"
                          value={discountCustomerId}
                          onChange={(e) => {
                            setDiscountError('')
                            setDiscountCustomerId(e.target.value)
                          }}
                          required
                        />
                        <Form.Text className="text-muted">
                          ID numérico del cliente en Oracle DB.
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="admDiscGrossAmount">
                        <Form.Label className="small fw-semibold">Monto Bruto CLP</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          step="1"
                          value={discountGrossClp}
                          onChange={(e) => {
                            setDiscountError('')
                            setDiscountGrossClp(e.target.value)
                          }}
                          required
                        />
                      </Form.Group>

                      <button
                        type="submit"
                        className="btn btn-secondary w-100 fw-bold"
                        disabled={discountLoading}
                      >
                        {discountLoading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Consultando PL/SQL...
                          </>
                        ) : (
                          '🔍 Calcular Descuento'
                        )}
                      </button>
                    </Form>

                    {discountPreview && (
                      <div className="mt-4 p-3 bg-light rounded border">
                        <h5 className="h6 fw-bold mb-2 text-primary">Detalle de Simulación</h5>
                        <ul className="list-unstyled mb-0 small">
                          <li className="mb-1">
                            <strong>Cliente ID:</strong> {discountPreview.customerId}
                          </li>
                          <li className="mb-1">
                            <strong>Monto Bruto:</strong>{' '}
                            <span className="tabular-nums">{formatearPrecioCLP(discountPreview.grossAmountClp)}</span>
                          </li>
                          <li className="mb-1">
                            <strong>Descuento Aplicado:</strong>{' '}
                            <span className="fw-bold text-success tabular-nums">
                              -{formatearPrecioCLP(discountPreview.discountClp)}
                            </span>
                          </li>
                          <li>
                            <strong>Total Neto Estimado:</strong>{' '}
                            <span className="fw-bold text-dark tabular-nums">
                              {formatearPrecioCLP(discountPreview.netAmountClp)}
                            </span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </main>
      </div>

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      <Modal
        show={showProductModal}
        onHide={() => {
          setShowProductModal(false)
          setProductModalError('')
        }}
      >
        <Form onSubmit={handleSaveProduct}>
          <Modal.Header closeButton>
            <Modal.Title className="h5" style={{ fontFamily: 'var(--font-heading)' }}>
              {isEditingProduct ? `Editar Producto: ${prodForm.codigo}` : 'Nuevo Producto'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {productModalError && (
              <Alert variant="danger" className="py-2 small mb-3">
                {productModalError}
              </Alert>
            )}
            {!isEditingProduct && (
              <Form.Group className="mb-3" controlId="prodCodigo">
                <Form.Label className="small fw-semibold">
                  Código (Patrón: <code>^[A-Z]{'{1,4}'}-[A-Z0-9]{'{2,5}'}-[A-Z0-9]{'{2,10}'}-[0-9]{'{2}'}$</code>)
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: G-FND-STRAT-01"
                  value={prodForm.codigo}
                  onChange={(e) => {
                    setProductModalError('')
                    setProdForm({ ...prodForm, codigo: e.target.value })
                  }}
                  required
                />
                <Form.Text className="text-muted">
                  Ejemplo válido: <code>G-FND-STRAT-01</code> o <code>A-SHU-SM58-01</code>
                </Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3" controlId="prodNombre">
              <Form.Label className="small fw-semibold">Nombre del Instrumento / Equipo</Form.Label>
              <Form.Control
                type="text"
                placeholder="Fender Stratocaster American Professional"
                value={prodForm.nombre}
                onChange={(e) => {
                  setProductModalError('')
                  setProdForm({ ...prodForm, nombre: e.target.value })
                }}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="prodCategoria">
              <Form.Label className="small fw-semibold">Categoría Oficial</Form.Label>
              <Form.Select
                value={prodForm.categoria}
                onChange={(e) => {
                  setProductModalError('')
                  setProdForm({ ...prodForm, categoria: e.target.value })
                }}
              >
                {CATEGORIAS_VALIDAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Group controlId="prodPrecio">
                  <Form.Label className="small fw-semibold">Precio CLP</Form.Label>
                  <Form.Control
                    type="number"
                    min="1000"
                    placeholder="150000"
                    value={prodForm.precioClp}
                    onChange={(e) => {
                      setProductModalError('')
                      setProdForm({ ...prodForm, precioClp: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="prodStock">
                  <Form.Label className="small fw-semibold">Stock Inicial</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    placeholder="10"
                    value={prodForm.stockDisponible}
                    onChange={(e) => {
                      setProductModalError('')
                      setProdForm({ ...prodForm, stockDisponible: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3" controlId="prodTags">
              <Form.Label className="small fw-semibold">Tags (separados por coma)</Form.Label>
              <Form.Control
                type="text"
                placeholder="guitarra, electrica, fender, profesional"
                value={prodForm.tags}
                onChange={(e) => {
                  setProductModalError('')
                  setProdForm({ ...prodForm, tags: e.target.value })
                }}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowProductModal(false)
                setProductModalError('')
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {isEditingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL AJUSTE DE STOCK */}
      <Modal
        show={showStockModal}
        onHide={() => {
          setShowStockModal(false)
          setStockModalError('')
        }}
      >
        <Form onSubmit={handleAjustarStock}>
          <Modal.Header closeButton>
            <Modal.Title className="h5" style={{ fontFamily: 'var(--font-heading)' }}>
              Ajuste Atómico de Stock ($inc)
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {stockModalError && (
              <Alert variant="danger" className="py-2 small">
                {stockModalError}
              </Alert>
            )}
            <Form.Group className="mb-3" controlId="admStockDelta">
              <Form.Label className="small fw-semibold">Variación de Stock ({stockAdjustment.codigo})</Form.Label>
              <Form.Control
                type="number"
                step="1"
                placeholder="Ej: 5 o -2"
                value={stockAdjustment.delta}
                onChange={(e) => {
                  setStockModalError('')
                  setStockAdjustment({
                    ...stockAdjustment,
                    delta: e.target.value,
                  })
                }}
                required
              />
              <Form.Text className="text-muted">
                Entero distinto de 0 (positivo para ingreso, negativo para salida o merma).
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="admStockMotivo">
              <Form.Label className="small fw-semibold">Motivo de Auditoría</Form.Label>
              <Form.Select
                value={stockAdjustment.motivo}
                onChange={(e) =>
                  setStockAdjustment({
                    ...stockAdjustment,
                    motivo: e.target.value,
                  })
                }
              >
                {MOTIVOS_AJUSTE.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowStockModal(false)
                setStockModalError('')
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Aplicar Ajuste
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL CREAR / EDITAR CLIENTE ORACLE */}
      <Modal
        show={showClienteModal}
        onHide={() => {
          setShowClienteModal(false)
          setClienteModalError('')
        }}
      >
        <Form onSubmit={handleSaveCliente}>
          <Modal.Header closeButton>
            <Modal.Title className="h5" style={{ fontFamily: 'var(--font-heading)' }}>
              {isEditingCliente ? `Editar Cliente: ${clienteForm.rut}` : 'Nuevo Cliente Oracle'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {clienteModalError && (
              <Alert variant="danger" className="py-2 small mb-3">
                {clienteModalError}
              </Alert>
            )}
            <Row className="g-2">
              <Col xs={12}>
                <Form.Group controlId="admClRut" className="mb-2">
                  <Form.Label className="small fw-semibold">RUT Chileno</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="12.345.678-9"
                    value={clienteForm.rut}
                    onChange={(e) => {
                      setClienteModalError('')
                      setClienteForm({ ...clienteForm, rut: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="admClNombres" className="mb-2">
                  <Form.Label className="small fw-semibold">Nombres</Form.Label>
                  <Form.Control
                    type="text"
                    value={clienteForm.firstName}
                    onChange={(e) => {
                      setClienteModalError('')
                      setClienteForm({ ...clienteForm, firstName: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="admClApellidos" className="mb-2">
                  <Form.Label className="small fw-semibold">Apellidos</Form.Label>
                  <Form.Control
                    type="text"
                    value={clienteForm.lastName}
                    onChange={(e) => {
                      setClienteModalError('')
                      setClienteForm({ ...clienteForm, lastName: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="admClEmail" className="mb-2">
                  <Form.Label className="small fw-semibold">Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={clienteForm.email}
                    onChange={(e) => {
                      setClienteModalError('')
                      setClienteForm({ ...clienteForm, email: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="admClFono" className="mb-2">
                  <Form.Label className="small fw-semibold">Teléfono</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="+56912345678"
                    value={clienteForm.phone}
                    onChange={(e) => {
                      setClienteModalError('')
                      setClienteForm({ ...clienteForm, phone: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId="admClComuna" className="mb-2">
                  <Form.Label className="small fw-semibold">Comuna</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Viña del Mar"
                    value={clienteForm.commune}
                    onChange={(e) => {
                      setClienteModalError('')
                      setClienteForm({ ...clienteForm, commune: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="admClRegion" className="mb-2">
                  <Form.Label className="small fw-semibold">Región</Form.Label>
                  <Form.Control
                    type="text"
                    value={clienteForm.region}
                    onChange={(e) => {
                      setClienteModalError('')
                      setClienteForm({ ...clienteForm, region: e.target.value })
                    }}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowClienteModal(false)
                setClienteModalError('')
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {isEditingCliente ? 'Actualizar Cliente' : 'Guardar en Oracle'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminPanel
