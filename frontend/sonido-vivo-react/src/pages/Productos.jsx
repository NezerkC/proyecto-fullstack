import { useEffect, useState } from 'react'
import { Alert, Spinner } from 'react-bootstrap'
import ProductCard from '../components/ProductCard'
import { useCart } from '../context/CartContext'
import { obtenerCatalogoPublico } from '../services/api'

const CATEGORIAS = ['Todas', 'Cuerdas', 'Audio Pro', 'Percusion', 'Teclados', 'Vientos', 'Accesorios']

function Productos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')

  const { addToCart } = useCart()

  useEffect(() => {
    let montado = true
    setLoading(true)

    const params = categoriaSeleccionada !== 'Todas' ? { categoria: categoriaSeleccionada } : {}
    obtenerCatalogoPublico(params)
      .then((res) => {
        if (!montado) return
        setProductos(res.items || [])
        setOffline(res.offline)
      })
      .catch((err) => {
        if (!montado) return
        console.warn('Error cargando catálogo:', err)
      })
      .finally(() => {
        if (montado) setLoading(false)
      })

    return () => {
      montado = false
    }
  }, [categoriaSeleccionada])

  const productosFiltrados = productos.filter((p) => {
    const coincideTexto =
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigoLegacy?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.marca?.toLowerCase().includes(busqueda.toLowerCase())
    return coincideTexto
  })

  const handleAddToCart = (producto) => {
    addToCart(producto, 1)
    setMensaje(`¡"${producto.nombre}" agregado al carrito!`)
    setTimeout(() => setMensaje(''), 3000)
  }

  return (
    <div className="catalog-page py-3">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h2 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Catálogo de Instrumentos y Audio
          </h1>
          <p className="text-muted small mb-0">
            Explora nuestro catálogo en vivo sincronizado con MongoDB y almacén central.
          </p>
        </div>
        {offline ? (
          <span className="badge badge-critical p-2">
            ⚠️ Modo Offline (Catálogo Local)
          </span>
        ) : (
          <span className="badge badge-ok p-2">
            🟢 En Línea con Backend Spring Boot
          </span>
        )}
      </div>

      {mensaje && (
        <Alert variant="success" dismissible onClose={() => setMensaje('')} className="mb-4">
          {mensaje}
        </Alert>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="filter-bar mb-4 p-3 bg-white rounded border">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-5">
            <div className="search-box position-relative">
              <input
                type="text"
                className="form-control search-input"
                placeholder="Buscar por nombre, código o marca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar productos"
              />
            </div>
          </div>
          <div className="col-12 col-md-7">
            <div className="chips-container d-flex gap-2 flex-wrap">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`chip ${categoriaSeleccionada === cat ? 'active' : ''}`}
                  onClick={() => setCategoriaSeleccionada(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listado de Productos */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando instrumentos musicales...</p>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="text-center py-5">
          <h5>No se encontraron productos</h5>
          <p className="text-muted">Intenta ajustando el filtro de búsqueda o categoría.</p>
        </div>
      ) : (
        <div className="product-grid">
          {productosFiltrados.map((prod) => (
            <div key={prod.codigo} className="product-grid-item">
              <ProductCard
                producto={prod}
                onAddToCart={handleAddToCart}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Productos
