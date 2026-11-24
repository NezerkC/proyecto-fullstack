import { createContext, useContext, useEffect, useState } from 'react'
import { loginUsuario } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('usuario')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  useEffect(() => {
    if (usuario) {
      localStorage.setItem('usuario', JSON.stringify(usuario))
    } else {
      localStorage.removeItem('usuario')
    }
  }, [usuario])

  const login = async (username, password) => {
    const res = await loginUsuario(username, password)
    if (res?.token) {
      setToken(res.token)
      const userObj = {
        username: res.username || username,
        roles: res.roles || [],
      }
      setUsuario(userObj)
      return { success: true, user: userObj }
    }
    throw new Error('Respuesta de autenticación inválida del servidor')
  }

  const logout = () => {
    setToken('')
    setUsuario(null)
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
  }

  const hasRole = (role) => {
    if (!usuario?.roles) return false
    const target = role.startsWith('ROLE_') ? role : `ROLE_${role}`
    return usuario.roles.includes(target) || usuario.roles.includes(role)
  }

  const isAdmin = hasRole('ROLE_ADMIN')
  const isVendedor = hasRole('ROLE_VENDEDOR')
  const isCliente = hasRole('ROLE_CLIENTE')

  const value = {
    token,
    usuario,
    isAuthenticated: Boolean(token),
    isAdmin,
    isVendedor,
    isCliente,
    hasRole,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider')
  }
  return context
}
