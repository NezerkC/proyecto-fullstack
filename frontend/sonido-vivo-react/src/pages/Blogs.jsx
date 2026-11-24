import { Link, useParams } from 'react-router-dom'

const ARTICULOS = [
  {
    id: '1',
    categoria: 'Luthería & Mantenimiento',
    fecha: '5 de Septiembre, 2026',
    autor: 'Rodrigo Tapia (Luthier Jefe Sonido Vivo)',
    tiempoLectura: '4 min de lectura',
    titulo: 'Cómo Proteger tu Guitarra de la Humedad y Salinidad en Viña del Mar',
    resumen:
      'Vivir cerca del océano tiene una magia única para componer, pero el aire marino y la humedad costera de la V Región pueden oxidar trastes y descalibrar el mástil en semanas si no tomás estas 4 medidas preventivas.',
    thumb: '/assets/img/thumb_guitarra_humedad.jpg',
    video: '/assets/img/Proteger_guitarra_de_humedad_1080p_202609081822.mp4',
    videoCaption:
      'Demostración práctica: Técnicas de limpieza y protección contra salinidad en nuestro taller de Viña del Mar.',
    contenido: [
      'En ciudades costeras como Viña del Mar, Valparaíso y Concón, la humedad relativa del aire suele superar habitualmente el 75% o incluso 85% durante las mañanas de vaguada costera. Para las maderas de instrumentos acústicos y eléctricos, esto representa un desafío mayúsculo que puede arruinar una guitarra si no se toman medidas a tiempo.',
      '1. Uso obligatorio de funda acolchada o estuche rígido con bolsitas de gel de sílice: Nunca dejes tu instrumento colgado en la pared si la habitación tiene ventilación directa hacia la brisa marina.',
      '2. Limpieza exhaustiva de cuerdas y diapasón post-ensayo: El sudor de los dedos sumado al salitre ambiental oxida el níquel de los trastes a una velocidad 3 veces superior que en Santiago.',
      '3. Hidratación controlada del diapasón con aceite de limón cada 4 a 6 meses: Evita la resequedad extrema en verano y la absorción desmedida en invierno.',
      '4. Calibración semestral del alma (truss rod): En Sonido Vivo ofrecemos servicio gratuito de chequeo de curvatura de mástil para todos los clientes que adquirieron su instrumento en nuestra tienda.',
    ],
  },
  {
    id: '2',
    categoria: 'Audio en Vivo & Estudio',
    fecha: '28 de Agosto, 2026',
    autor: 'Felipe González (Ingeniero de Sonido Sonido Vivo)',
    tiempoLectura: '5 min de lectura',
    titulo: 'Shure SM58 vs SM57: ¿Cuál es el Micrófono Definitivo para tu Banda?',
    resumen:
      'Ambos son leyendas indestructibles del rock y la música en vivo, pero sus respuestas de frecuencia y rejillas marcan diferencias cruciales entre la voz principal y la captura de un amplificador de guitarra.',
    thumb: '/assets/img/thumb_shure_mics.jpg',
    video: '/assets/img/Shure_microphones_compared_1080p_202609081822.mp4',
    videoCaption:
      'Comparativa sonora en tiempo real: Respuesta en frecuencias y patrones polares en nuestra sala de pruebas.',
    contenido: [
      'Desde su lanzamiento en la década de 1960, los micrófonos Shure SM58 y SM57 han sido el estándar de la industria mundial en escenarios de cualquier escala. Sin embargo, una de las preguntas más frecuentes en nuestra tienda de Viña del Mar es: "¿Puedo usar un SM57 para cantar o un SM58 para mi amplificador?"',
      'La cápsula interna (el cartucho transductor Unidyne III) es prácticamente idéntica en ambos micrófonos. La verdadera diferencia radica en el diseño acústico de la rejilla superior:',
      '• Shure SM58: Cuenta con una rejilla esférica con filtro antipop interno de espuma. Esto suaviza los sonidos oclusivos ("p", "b", "t") y aleja la boca de la cápsula unos milímetros, haciéndolo el rey indiscutido de las voces en vivo.',
      '• Shure SM57: Tiene una rejilla rotatoria más corta y plana. Esto permite colocar la fuente sonora mucho más cerca del diafragma, generando un efecto de proximidad más pronunciado ideal para redoblantes de batería y conos de amplificadores de guitarra eléctrica.',
      'Conclusión técnica: Si cantas en vivo, el SM58 te protegerá de ruidos de viento y golpes de aire. Si grabas instrumentos con alto nivel de presión sonora o buscas un micrófono todoterreno de estudio, el SM57 es la inversión más versátil.',
    ],
  },
]

function Blogs() {
  const { id } = useParams()

  // Si hay ID en la URL, mostramos la vista de detalle
  if (id) {
    const articulo = ARTICULOS.find((a) => a.id === id) || ARTICULOS[0]

    return (
      <div className="blog-detail-page py-3">
        <nav aria-label="Migas de pan" className="mb-4">
          <p className="small text-muted mb-0">
            <Link to="/" className="text-decoration-none text-muted">
              Inicio
            </Link>{' '}
            &gt;{' '}
            <Link to="/blogs" className="text-decoration-none text-muted">
              Blogs
            </Link>{' '}
            &gt;{' '}
            <span className="text-primary fw-bold">{articulo.titulo}</span>
          </p>
        </nav>

        <article className="blog-detail-article mx-auto p-4 bg-white rounded border" style={{ maxWidth: '820px' }}>
          <span className="badge badge-category mb-2">{articulo.categoria}</span>
          <h1 className="h2 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            {articulo.titulo}
          </h1>

          <div className="blog-detail-meta d-flex gap-3 text-muted small mb-4 flex-wrap pb-3 border-bottom">
            <span>✍️ {articulo.autor}</span>
            <span>📅 {articulo.fecha}</span>
            <span>⏱️ {articulo.tiempoLectura}</span>
          </div>

          <div className="blog-detail-content">
            <p className="lead mb-4" style={{ fontSize: '1.05rem', lineHeight: '1.8' }}>
              {articulo.contenido[0]}
            </p>

            <div className="video-section my-4">
              <div className="video-card-container">
                <video
                  controls
                  poster={articulo.thumb}
                  preload="metadata"
                  playsInline
                  className="responsive-video"
                >
                  <source src={articulo.video} type="video/mp4" />
                  Tu navegador no soporta la reproducción de video HTML5.
                </video>
              </div>
              <p className="small text-muted text-center mt-2">
                {articulo.videoCaption}
              </p>
            </div>

            {articulo.contenido.slice(1).map((parrafo, idx) => (
              <p key={idx} className="mb-3 text-muted" style={{ lineHeight: '1.8' }}>
                {parrafo}
              </p>
            ))}
          </div>

          <div className="mt-5 pt-4 border-top text-center">
            <Link to="/blogs" className="btn btn-outline-primary">
              &larr; Volver a Todos los Blogs
            </Link>
          </div>
        </article>
      </div>
    )
  }

  // Vista de lista de blogs (/blogs)
  return (
    <div className="blogs-page py-3">
      <header className="section-header text-center mb-4">
        <h1 className="h2" style={{ fontFamily: 'var(--font-heading)' }}>
          Blog &amp; Novedades Musicales
        </h1>
        <p className="text-muted">
          Artículos escritos por nuestros músicos y técnicos de audio para mejorar tu técnica y cuidar tus equipos.
        </p>
      </header>

      <div className="blog-grid row g-4">
        {ARTICULOS.map((art) => (
          <div key={art.id} className="col-12 col-md-6">
            <article className="blog-card h-100 d-flex flex-column bg-white rounded border overflow-hidden shadow-sm">
              <div
                className="blog-card-thumb position-relative"
                style={{ height: '220px', overflow: 'hidden', background: '#000' }}
              >
                <img
                  src={art.thumb}
                  alt={art.titulo}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  className="position-absolute bottom-0 end-0 m-2 text-white small px-2 py-1 rounded fw-bold"
                  style={{ background: 'rgba(0,0,0,0.75)' }}
                >
                  ▶ Video Guía
                </span>
              </div>

              <div className="blog-card-body p-4 d-flex flex-column flex-grow-1">
                <div className="blog-card-meta small text-muted text-uppercase fw-bold mb-2">
                  {art.categoria} • {art.fecha}
                </div>
                <h2 className="blog-card-title h5 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  {art.titulo}
                </h2>
                <p className="blog-card-desc text-muted small mb-4 flex-grow-1" style={{ lineHeight: '1.6' }}>
                  {art.resumen}
                </p>
                <div className="mt-auto">
                  <Link to={`/blogs/${art.id}`} className="btn btn-primary btn-sm w-100">
                    Leer Artículo Completo &rarr;
                  </Link>
                </div>
              </div>
            </article>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Blogs
