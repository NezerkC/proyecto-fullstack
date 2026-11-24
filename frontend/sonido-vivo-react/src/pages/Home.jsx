import { useEffect, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useCart } from '../context/CartContext'
import {
  OBJETOS_CREADOS_POR_PROGRAMADOR,
  obtenerCatalogoActivo,
} from '../data/productos'
import { obtenerCatalogoPublico } from '../services/api'

const CODIGOS_DESTACADOS = ['GA001', 'GE001', 'BA001', 'BT001', 'TC001', 'MI001']

function Home() {
  const [catalogo, setCatalogo] = useState(() => obtenerCatalogoActivo())
  const { addToCart } = useCart()

  useEffect(() => {
    let montado = true
    obtenerCatalogoPublico()
      .then((res) => {
        if (montado && res?.items && res.items.length > 0) {
          setCatalogo(res.items)
        }
      })
      .catch((err) => {
        console.warn('Error al hidratar catálogo en Home:', err)
      })
    return () => {
      montado = false
    }
  }, [])

  const filtrados = catalogo.filter((p) => {
    const code = p.codigo || ''
    const legacy = p.codigoLegacy || p.especificaciones?.codigo_legacy || ''
    return CODIGOS_DESTACADOS.includes(code) || CODIGOS_DESTACADOS.includes(legacy)
  })
  const destacados = filtrados.length > 0 ? filtrados : catalogo.slice(0, 6)

  return (
    <>
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-tag">11 Años de Trayectoria</div>
          <h1 className="hero-title">
            Tu Sonido, Tu Pasión, <span>En Vivo</span>.
          </h1>
          <p className="hero-subtitle">
            Equipamos a bandas, estudiantes y productores de la V Región y todo Chile
            con las mejores marcas mundiales: Fender, Yamaha, Roland, Marshall, Shure y
            más.
          </p>
          <div className="hero-actions">
            <Link to="/productos" className="btn btn-primary">
              Explorar Catálogo Oficial
            </Link>
            <Link to="/nosotros" className="btn btn-outline">
              Conoce Nuestra Tienda
            </Link>
          </div>

          <div className="hero-video-box">
            <div className="video-card-container">
              <video
                controls
                poster="/assets/img/thumb_promo.jpg"
                preload="metadata"
                playsInline
                className="responsive-video"
              >
                <source
                  src="/assets/img/video_promocional_tienda.mp4"
                  type="video/mp4"
                />
                Tu navegador no soporta la reproducción de video HTML5.
              </video>
            </div>
            <div className="hero-video-caption">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              <span>
                Conoce en video la experiencia Sonido Vivo en nuestra tienda de Viña del
                Mar
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="benefits-section"
        aria-label="Ventajas de comprar en Sonido Vivo"
      >
        <div className="benefits-grid">
          <article className="benefit-card">
            <span className="benefit-indicator">01</span>
            <h3>Despacho a Todo Chile</h3>
            <p>Envíos rápidos y asegurados a todo Chile con atención personalizada.</p>
          </article>
          <article className="benefit-card">
            <span className="benefit-indicator">02</span>
            <h3>Garantía y Servicio Oficial</h3>
            <p>
              Todos nuestros instrumentos cuentan con garantía técnica y servicio de calibración profesional.
            </p>
          </article>
          <article className="benefit-card">
            <span className="benefit-indicator">03</span>
            <h3>Asesoría por Músicos</h3>
            <p>
              Nuestro equipo está integrado por músicos experimentados que te orientarán según tu estilo.
            </p>
          </article>
        </div>
      </section>

      <section className="featured-section">
        <header className="section-header">
          <h2>Instrumentos Destacados</h2>
          <p>
            Selección curada por nuestros especialistas de tienda. Probados,
            calibrados y listos para tocar.
          </p>
        </header>

        <Row xs={1} sm={2} md={3} className="g-4 mb-4">
          {destacados.map((producto) => (
            <Col key={producto.codigo}>
              <ProductCard
                producto={producto}
                onAddToCart={(prod) => addToCart(prod, 1)}
              />
            </Col>
          ))}
        </Row>
      </section>

      <section className="custom-objects-section" id="seccion-objetos-propios">
        <header className="section-header">
          <h2>Objetos Creados por el Usuario</h2>
          <p>
            Espacio normalizado para que el desarrollador inserte sus propios
            componentes, modelos o colecciones.
          </p>
        </header>

        <div className="custom-objects-grid" id="grid-objetos-propios">
          {OBJETOS_CREADOS_POR_PROGRAMADOR.map((obj) => (
            <article key={obj.id} className="custom-card">
              <span className="product-code-tag">{obj.id}</span>
              <h4>{obj.nombre}</h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {obj.descripcion}
              </p>
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  ${obj.precio.toLocaleString('es-CL')}
                </span>
                <span className="badge badge-ok">{obj.estado}</span>
              </div>
            </article>
          ))}

          <article className="custom-card placeholder">
            <span>+ Espacio disponible para tu siguiente objeto</span>
          </article>
        </div>
      </section>

      <section
        style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '36px 24px',
          margin: '48px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <span className="badge badge-free" style={{ alignSelf: 'flex-start' }}>
          Descuento Estudiantes Duoc UC
        </span>
        <h2 style={{ fontSize: '1.6rem' }}>¿Estudias con nosotros en la V Región?</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '650px' }}>
          Regístrate con tu correo <strong>@duoc.cl</strong> o{' '}
          <strong>@profesor.duoc.cl</strong> y accede a calibraciones gratuitas y
          precios especiales en accesorios y cuerdas durante todo el semestre académico.
        </p>
        <div>
          <Link to="/login" className="btn btn-primary">
            Ingresar a mi Cuenta
          </Link>
        </div>
      </section>
    </>
  )
}

export default Home
