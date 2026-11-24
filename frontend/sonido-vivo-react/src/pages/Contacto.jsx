import { useState } from 'react'
import { Alert } from 'react-bootstrap'

function Contacto() {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    comentario: '',
  })
  const [errors, setErrors] = useState({})
  const [enviado, setEnviado] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validar = () => {
    const errs = {}
    if (!formData.nombre.trim()) {
      errs.nombre = 'El nombre es obligatorio (máximo 100 caracteres).'
    }
    const correoRegex = /^[\w.-]+@(duoc\.cl|profesor\.duoc\.cl|gmail\.com)$/i
    if (!formData.correo.trim() || !correoRegex.test(formData.correo.trim())) {
      errs.correo = 'Solo correos @duoc.cl, @profesor.duoc.cl o @gmail.com.'
    }
    if (!formData.comentario.trim()) {
      errs.comentario = 'El comentario es requerido (máximo 500 caracteres).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validar()) {
      setEnviado(true)
      setFormData({ nombre: '', correo: '', comentario: '' })
      setTimeout(() => setEnviado(false), 6000)
    }
  }

  return (
    <div className="contacto-page">
      <header className="section-header text-center mb-4">
        <h1 className="h2" style={{ fontFamily: 'var(--font-heading)' }}>
          Contactate con Sonido Vivo
        </h1>
        <p className="text-muted">
          Estamos a pasos de la Plaza Vergara en pleno centro de Viña del Mar. Respondemos tus consultas en el día.
        </p>
      </header>

      <div className="row g-4">
        {/* Columna 1: Formulario con Validación */}
        <div className="col-12 col-lg-7">
          <div className="form-card" style={{ maxWidth: '100%', margin: 0 }}>
            <h2 className="h4 mb-3">Envianos un Mensaje Directo</h2>

            {enviado && (
              <Alert variant="success" dismissible onClose={() => setEnviado(false)} className="mb-3">
                ¡Gracias por escribirnos! Tu mensaje ha sido recibido por el equipo técnico de Viña del Mar. Te responderemos a la brevedad.
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group mb-3">
                <label htmlFor="contacto-nombre" className="form-label fw-bold">
                  Nombre Completo:
                </label>
                <input
                  type="text"
                  id="contacto-nombre"
                  name="nombre"
                  className={`form-control ${errors.nombre ? 'is-invalid' : ''}`}
                  placeholder="Tu nombre y apellido"
                  maxLength={100}
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
                {errors.nombre && <div className="invalid-feedback">{errors.nombre}</div>}
              </div>

              <div className="form-group mb-3">
                <label htmlFor="contacto-correo" className="form-label fw-bold">
                  Correo Electrónico:
                </label>
                <input
                  type="email"
                  id="contacto-correo"
                  name="correo"
                  className={`form-control ${errors.correo ? 'is-invalid' : ''}`}
                  placeholder="ejemplo@duoc.cl o ejemplo@gmail.com"
                  maxLength={100}
                  value={formData.correo}
                  onChange={handleChange}
                  required
                />
                {errors.correo && <div className="invalid-feedback">{errors.correo}</div>}
              </div>

              <div className="form-group mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="contacto-comentario" className="form-label fw-bold mb-0">
                    Consulta o Comentario:
                  </label>
                  <span className="small text-muted tabular-nums">
                    {formData.comentario.length}/500
                  </span>
                </div>
                <textarea
                  id="contacto-comentario"
                  name="comentario"
                  rows={5}
                  className={`form-control ${errors.comentario ? 'is-invalid' : ''}`}
                  placeholder="Escribí aquí tu duda sobre instrumentos, stock o cotizaciones para bandas..."
                  maxLength={500}
                  value={formData.comentario}
                  onChange={handleChange}
                  required
                />
                {errors.comentario && <div className="invalid-feedback">{errors.comentario}</div>}
              </div>

              <button type="submit" className="btn btn-primary w-100">
                📨 Enviar Mensaje a Tienda
              </button>
            </form>
          </div>
        </div>

        {/* Columna 2: Datos Físicos, Horarios y Ubicación */}
        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          <article className="benefit-card text-start">
            <h3 className="h5 text-primary mb-2">Tienda Física Viña del Mar</h3>
            <p className="mb-1 text-muted small">
              <strong className="text-dark">Dirección:</strong> Calle Valparaíso 740, Galería Cristal, Local 12, Viña del Mar, Región de Valparaíso.
            </p>
            <p className="mb-1 text-muted small">
              <strong className="text-dark">Teléfono Ventas:</strong> +56 32 268 9000
            </p>
            <p className="mb-1 text-muted small">
              <strong className="text-dark">WhatsApp Consultas:</strong> +56 9 8765 4321
            </p>
            <p className="mb-0 text-muted small">
              <strong className="text-dark">Email:</strong> contacto@sonidovivo.cl
            </p>
          </article>

          <article className="benefit-card text-start">
            <h3 className="h5 text-primary mb-2">Horarios de Atención Presencial</h3>
            <ul className="list-unstyled text-muted small mb-0 d-flex flex-column gap-1">
              <li>• <strong>Lunes a Viernes:</strong> 10:00 a 19:30 hrs continuo.</li>
              <li>• <strong>Sábados:</strong> 10:30 a 14:30 hrs.</li>
              <li>• <strong>Domingos y Festivos:</strong> Cerrado (ventas web activas).</li>
            </ul>
          </article>

          <div className="p-3 bg-white rounded border text-center">
            <span className="small text-muted fw-bold d-block mb-1">[ MAPA DE UBICACIÓN ]</span>
            <h4 className="h6 mb-1">Ubicación Céntrica en Viña</h4>
            <p className="small text-muted mb-0">
              A 2 cuadras de Estación Viña del Mar (Metro Valparaíso / EFE). Fácil acceso y estacionamiento cercano.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contacto
