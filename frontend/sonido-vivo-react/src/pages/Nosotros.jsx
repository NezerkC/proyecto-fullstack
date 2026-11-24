import { Link } from 'react-router-dom'

function Nosotros() {
  return (
    <div className="nosotros-page">
      {/* Hero Sección Nosotros */}
      <section className="hero-section text-center py-4 mb-4">
        <div className="hero-content">
          <span className="hero-tag">Nuestra Identidad Musical</span>
          <h1 className="hero-title mt-2">
            11 Años Equipando a los Músicos de <span>Viña del Mar</span>
          </h1>
          <p className="hero-subtitle mt-2">
            Nacimos de la pasión por los escenarios en vivo, las salas de ensayo y el compromiso de entregar instrumentos calibrados de verdad.
          </p>
        </div>
      </section>

      {/* Misión, Visión y Trayectoria */}
      <div className="benefits-grid mb-4">
        <article className="benefit-card text-start">
          <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '12px' }}>🌊</span>
          <h2 className="h4 mb-2">Nuestra Historia</h2>
          <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
            Fundada en 2015 en el corazón comercial de Viña del Mar, <strong>Sonido Vivo</strong> surgió como respuesta a la falta de asesoría técnica calificada en la Región de Valparaíso. Empezamos con un modesto stock de cuerdas y guitarras acústicas, y hoy somos el distribuidor autorizado de más de 300 referencias de clase mundial.
          </p>
        </article>

        <article className="benefit-card text-start">
          <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '12px' }}>🎯</span>
          <h2 className="h4 mb-2">Misión</h2>
          <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
            Proveer a músicos principiantes, profesionales, escuelas de música y salas de eventos de instrumentos de la más alta calidad, acompañados de un servicio personalizado de luthería y soporte posventa transparente.
          </p>
        </article>

        <article className="benefit-card text-start">
          <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '12px' }}>🚀</span>
          <h2 className="h4 mb-2">Visión</h2>
          <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
            Ser reconocidos como el ecosistema de audio e instrumentos musicales más confiable y moderno de Chile, integrando la experiencia cálida de nuestra tienda física con una plataforma web ágil y moderna.
          </p>
        </article>
      </div>

      {/* Sección: El Problema y Nuestra Solución */}
      <section className="form-card mb-4 p-4" style={{ maxWidth: '100%' }}>
        <div className="solution-grid">
          <div>
            <span className="badge badge-category mb-2">Origen &amp; Solución</span>
            <h2 className="h3 mb-3">El Problema que Detectamos y Cómo lo Solucionamos</h2>
            <p className="text-muted mb-3" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
              Durante años, los músicos, estudiantes y docentes de Viña del Mar y la Región de Valparaíso enfrentaron un problema constante: adquirir instrumentos sin ajuste técnico previo a las duras condiciones de humedad costera, en tiendas sin personal especializado para guiarlos.
            </p>
            <p className="text-muted mb-3" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
              <strong>Nuestra solución fue clara y contundente:</strong> crear una tienda-taller atendida exclusivamente por músicos calificados, con servicio de luthería integrado y convenios de apoyo directo a la comunidad académica de Duoc UC.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <span className="badge badge-ok">✓ Asesoría Técnica Personalizada</span>
              <span className="badge badge-ok">✓ Taller de Luthería Propio</span>
              <span className="badge badge-ok">✓ Alianza Formativa Duoc UC</span>
            </div>
          </div>
          <div>
            <div className="video-card-container">
              <video
                controls
                poster="/assets/img/thumb_ayuda.jpg"
                preload="metadata"
                playsInline
                className="responsive-video"
              >
                <source src="/assets/img/Persona_contando_ayuda.mp4" type="video/mp4" />
                Tu navegador no soporta reproducción de video HTML5.
              </video>
            </div>
            <p className="mt-2 small text-muted text-center">
              Explicación y testimonio: Cómo resolvemos las necesidades técnicas de nuestra comunidad musical
            </p>
          </div>
        </div>
      </section>

      {/* Valores y Compromiso Local */}
      <section className="form-card mb-4" style={{ maxWidth: '100%' }}>
        <h2 className="h4 mb-3">¿Por Qué Elegir Sonido Vivo?</h2>
        <ul className="list-unstyled d-grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <li style={{ background: '#ffffff', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-primary)' }}>
            <strong className="d-block mb-1" style={{ fontSize: '1.05rem' }}>Taller de Luthería Propio</strong>
            <span className="text-muted small">
              Cada instrumento es desempacado, inspeccionado y calibrado según la humedad costera de nuestra zona antes de ser entregado.
            </span>
          </li>
          <li style={{ background: '#ffffff', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-primary)' }}>
            <strong className="d-block mb-1" style={{ fontSize: '1.05rem' }}>Alianza con Duoc UC</strong>
            <span className="text-muted small">
              Brindamos beneficios exclusivos y asesoría a las carreras de música, sonido y diseño de la sede Viña del Mar.
            </span>
          </li>
          <li style={{ background: '#ffffff', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-primary)' }}>
            <strong className="d-block mb-1" style={{ fontSize: '1.05rem' }}>Stock Real y Garantizado</strong>
            <span className="text-muted small">
              Lo que ves en nuestro catálogo digital está efectivamente en nuestras bodegas físicas de Viña del Mar.
            </span>
          </li>
        </ul>
      </section>

      {/* Llamado a la acción */}
      <div className="text-center my-4 d-flex justify-content-center gap-3">
        <Link to="/productos" className="btn btn-primary">
          Ver Nuestro Catálogo Disponible
        </Link>
        <Link to="/contacto" className="btn btn-secondary">
          Visitar Nuestra Tienda
        </Link>
      </div>
    </div>
  )
}

export default Nosotros
