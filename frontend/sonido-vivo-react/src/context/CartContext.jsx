import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('cart')
    if (!saved) return []
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems))
  }, [cartItems])

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.codigo) return
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.codigo === product.codigo)
      if (idx >= 0) {
        const next = [...prev]
        const currentQty = next[idx].quantity || 1
        const maxStock = next[idx].stock ?? product.stock ?? 999
        const newQty = Math.min(currentQty + quantity, maxStock > 0 ? maxStock : currentQty + quantity)
        next[idx] = { ...next[idx], quantity: newQty }
        return next
      }
      return [...prev, { ...product, quantity }]
    })
  }

  const removeFromCart = (codigo) => {
    setCartItems((prev) => prev.filter((item) => item.codigo !== codigo))
  }

  const updateQuantity = (codigo, quantity) => {
    if (quantity <= 0) {
      removeFromCart(codigo)
      return
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.codigo === codigo) {
          const maxStock = item.stock ?? 999
          const safeQty = Math.min(quantity, maxStock > 0 ? maxStock : quantity)
          return { ...item, quantity: safeQty }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('cart')
  }

  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0)
  const totalAmount = cartItems.reduce(
    (acc, item) => acc + (Number(item.precio) || 0) * (item.quantity || 0),
    0
  )

  const value = {
    cartItems,
    totalItems,
    totalAmount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider')
  }
  return context
}
