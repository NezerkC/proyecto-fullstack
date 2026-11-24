import { useState } from 'react'
import { Badge, Dropdown } from 'react-bootstrap'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

function Navigation() {
  const { usuario, isAuthenticated, isAdmin, isVendedor, logout } = useAuth()
  const { totalItems } = useCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleMenu = () => setIsMenuOpen((prev) => !prev)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="main-header">
      <div className="container header-content">
        <Link
          to="/"
          className="logo"
          onClick={closeMenu}
          aria-label="Ir a página de inicio de Sonido Vivo"
        >
          <img
            src="/assets/img/logo.svg"
            alt="Sonido Vivo - Instrumentos Musicales y Audio"
            height="46"
          />
        </Link>

        <button
          className={`menu-toggle ${isMenuOpen ? 'is-active' : ''}`}
          type="button"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`main-nav ${isMenuOpen ? 'is-open' : ''}`}
          aria-label="Navegación principal"
        >
          <ul>
            <li>
              <NavLink to="/" end onClick={closeMenu}>
                Inicio
              </NavLink>
            </li>
            <li>
              <NavLink to="/productos" onClick={closeMenu}>
                Catálogo
              </NavLink>
            </li>
            <li>
              <NavLink to="/nosotros" onClick={closeMenu}>
                Nosotros
              </NavLink>
            </li>
            <li>
              <NavLink to="/blogs" onClick={closeMenu}>
                Blogs
              </NavLink>
            </li>
            <li>
              <NavLink to="/contacto" onClick={closeMenu}>
                Contacto
              </NavLink>
            </li>
            {(isVendedor || isAdmin) && (
              <li>
                <NavLink to="/vendedor" onClick={closeMenu}>
                  Vendedor POS
                </NavLink>
              </li>
            )}
            {isAdmin && (
              <li>
                <NavLink to="/admin" onClick={closeMenu}>
                  Admin
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="secondary"
                size="sm"
                id="user-dropdown"
                className="d-flex align-items-center gap-2"
              >
                <span>👤 {usuario?.username}</span>
                <Badge
                  bg={isAdmin ? 'danger' : isVendedor ? 'warning' : 'info'}
                  text={isVendedor ? 'dark' : 'white'}
                >
                  {isAdmin ? 'ADMIN' : isVendedor ? 'VENDEDOR' : 'CLIENTE'}
                </Badge>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Header>Roles: {usuario?.roles?.join(', ')}</Dropdown.Header>
                {isAdmin && (
                  <Dropdown.Item as={Link} to="/admin" onClick={closeMenu}>
                    Panel Administrador
                  </Dropdown.Item>
                )}
                {(isVendedor || isAdmin) && (
                  <Dropdown.Item as={Link} to="/vendedor" onClick={closeMenu}>
                    Panel Vendedor (POS)
                  </Dropdown.Item>
                )}
                <Dropdown.Item as={Link} to="/carrito" onClick={closeMenu}>
                  Mi Carrito
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  Cerrar Sesión
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <Link to="/login" className="btn btn-secondary btn-sm" onClick={closeMenu}>
              Ingresar
            </Link>
          )}

          <Link
            to="/carrito"
            className="cart-btn"
            onClick={closeMenu}
            aria-label="Ver carrito de compras"
          >
            <svg
              className="cart-icon"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {totalItems > 0 && (
              <span className="cart-badge tabular-nums">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Navigation
