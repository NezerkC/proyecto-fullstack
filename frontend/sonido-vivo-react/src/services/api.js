import { PRODUCTOS_SONIDO_VIVO } from '../data/productos'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/**
 * Cliente HTTP unificado con soporte Bearer token
 */
export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.message || `Error HTTP: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

/**
 * Autenticación de Usuario (Admin, Vendedor o Cliente)
 */
export async function loginUsuario(username, password) {
  const data = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  if (data?.token) {
    localStorage.setItem('token', data.token)
    const userObj = {
      username: data.username || username,
      roles: data.roles || [],
    }
    localStorage.setItem('usuario', JSON.stringify(userObj))
  }
  return data
}

/**
 * Alias de compatibilidad
 */
export const loginAdmin = loginUsuario

/**
 * Normaliza los productos devueltos por el backend Spring Boot
 * mapeando precio_clp / precioClp -> precio y stock_disponible / stockDisponible -> stock
 */
export function normalizarProducto(item) {
  if (!item) return item
  const espec = item.especificaciones || {}
  const precio = item.precioClp ?? item.precio_clp ?? item.precio ?? 0
  const stock = item.stockDisponible ?? item.stock_disponible ?? item.stock ?? 0
  const imagen = item.imagen || espec.imagen || 'GA001.jpg'
  const marca = item.marca || espec.marca || 'Sonido Vivo'
  const modelo = item.modelo || espec.modelo || ''
  const descripcion = item.descripcion || espec.descripcion || ''
  const subcategoria = item.subcategoria || espec.subcategoria || espec.tipo || item.categoria || ''
  const codigoLegacy = item.codigoLegacy || espec.codigo_legacy || item.codigo || ''
  const stockCritico = item.stockCritico ?? espec.stock_critico ?? 3

  return {
    ...item,
    precio,
    stock,
    imagen,
    marca,
    modelo,
    descripcion,
    subcategoria,
    codigoLegacy,
    stockCritico,
    // Compatibilidad con vistas
    precio_clp: item.precio_clp ?? precio,
    stock_disponible: item.stock_disponible ?? stock,
    precioClp: item.precioClp ?? precio,
    stockDisponible: item.stockDisponible ?? stock,
  }
}

/**
 * Catálogo público (GET /public/products)
 * Con fallback a productos locales si no hay conexión o falla la red
 */
export async function obtenerCatalogoPublico(params = {}) {
  try {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.set('page', params.page)
    const size = params.size !== undefined ? params.size : 100
    query.set('size', size)
    if (params.categoria) query.set('categoria', params.categoria)
    if (params.estado) query.set('estado', params.estado)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    const response = await apiClient(`/public/products${queryString}`)

    const rawList = Array.isArray(response)
      ? response
      : (Array.isArray(response?.content) ? response.content : [])

    if (rawList.length > 0) {
      return { items: rawList.map(normalizarProducto), offline: false }
    }
    return { items: PRODUCTOS_SONIDO_VIVO.map(normalizarProducto), offline: false }
  } catch (error) {
    console.warn('API /public/products no disponible, usando fallback local:', error.message)
    let fallback = PRODUCTOS_SONIDO_VIVO.map(normalizarProducto)
    if (params.categoria) {
      fallback = fallback.filter((p) => p.categoria.toLowerCase() === params.categoria.toLowerCase())
    }
    return { items: fallback, offline: true }
  }
}

/**
 * Obtener productos del catálogo administrativo (GET /admin/products)
 * Requiere ROLE_ADMIN o ROLE_VENDEDOR
 */
export async function obtenerProductos(params = {}) {
  try {
    let queryString = ''
    if (typeof params === 'string') {
      queryString = params ? (params.startsWith('?') ? params : `?${params}`) : '?size=100'
    } else {
      const searchParams = new URLSearchParams({ size: 100, ...params })
      queryString = `?${searchParams.toString()}`
    }
    const endpoint = `/admin/products${queryString}`
    const response = await apiClient(endpoint)

    const rawList = Array.isArray(response)
      ? response
      : (Array.isArray(response?.content) ? response.content : [])

    if (rawList.length > 0) {
      return rawList.map(normalizarProducto)
    }
    return PRODUCTOS_SONIDO_VIVO.map(normalizarProducto)
  } catch (error) {
    console.warn('Fallo al obtener productos de API admin, utilizando fallback local:', error.message)
    return PRODUCTOS_SONIDO_VIVO.map(normalizarProducto)
  }
}

/**
 * Obtener métricas agregadas del inventario (NoSQL Pipeline)
 */
export async function obtenerMetricas() {
  return apiClient('/admin/dashboard/metrics')
}

/**
 * Crear nuevo producto (POST /admin/products)
 */
export async function crearProducto(payload) {
  const body = {
    codigo: payload.codigo,
    nombre: payload.nombre,
    categoria: payload.categoria,
    precioClp: Number(payload.precioClp ?? payload.precio_clp ?? payload.precio),
    stockDisponible: Number(payload.stockDisponible ?? payload.stock_disponible ?? payload.stock),
    especificaciones: payload.especificaciones || {},
    tags: payload.tags || [],
  }

  return apiClient('/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Actualizar producto existente (PUT /admin/products/{codigo})
 */
export async function actualizarProducto(codigo, payload) {
  const body = {
    nombre: payload.nombre,
    categoria: payload.categoria,
    precioClp: Number(payload.precioClp ?? payload.precio_clp ?? payload.precio),
    stockDisponible: Number(payload.stockDisponible ?? payload.stock_disponible ?? payload.stock),
    especificaciones: payload.especificaciones || {},
    tags: payload.tags || [],
  }

  return apiClient(`/admin/products/${encodeURIComponent(codigo)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/**
 * Ajustar stock atómicamente ($inc) (PATCH /admin/products/{codigo}/stock)
 * delta: número positivo o negativo
 * motivo: 'VENTA_DIRECTA_MOSTRADOR' | 'DEVOLUCION_CLIENTE' | 'MERMA_AVERIA' | 'INGRESO_PROVEEDOR'
 */
export async function ajustarStock(codigo, delta, motivo = 'INGRESO_PROVEEDOR') {
  return apiClient(`/admin/products/${encodeURIComponent(codigo)}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ delta: Number(delta), motivo }),
  })
}

/**
 * Descontinuar producto (DELETE /admin/products/{codigo})
 */
export async function descontinuarProducto(codigo) {
  return apiClient(`/admin/products/${encodeURIComponent(codigo)}`, {
    method: 'DELETE',
  })
}

/**
 * Reajustar precios masivamente (POST /admin/operations/price-adjustment)
 */
export async function reajustarPrecios(porcentaje, categoria, motivo) {
  const body = {
    porcentaje: Number(porcentaje),
    categoria: categoria || null,
    motivo: motivo || 'Ajuste general de catálogo',
  }
  return apiClient('/admin/operations/price-adjustment', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Obtener clientes desde Oracle (GET /admin/customers)
 */
export async function obtenerClientes() {
  return apiClient('/admin/customers')
}

/**
 * Crear cliente en Oracle (POST /admin/customers)
 */
export async function crearCliente(cliente) {
  return apiClient('/admin/customers', {
    method: 'POST',
    body: JSON.stringify(cliente),
  })
}

/**
 * Actualizar cliente en Oracle (PUT /admin/customers/{id})
 */
export async function actualizarCliente(id, cliente) {
  return apiClient(`/admin/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(cliente),
  })
}

/**
 * Registrar venta administrativa / POS (POST /admin/operations/sales)
 */
export async function registrarVentaAdmin(saleData) {
  const body = {
    customerId: String(saleData.customerId),
    productCode: saleData.productCode,
    quantity: Number(saleData.quantity),
    unitPriceClp: Number(saleData.unitPriceClp),
  }
  return apiClient('/admin/operations/sales', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Registrar compra online del cliente (POST /store/sales)
 */
export async function registrarCompraCliente(saleData) {
  const body = {
    customerId: String(saleData.customerId),
    productCode: saleData.productCode,
    quantity: Number(saleData.quantity),
    unitPriceClp: Number(saleData.unitPriceClp),
  }
  return apiClient('/store/sales', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
