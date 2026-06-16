export interface CartItem {
  id: string
  dishId: string
  dishName: string
  cuisineRegion: string
  traySize: 'half' | 'medium' | 'full'
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
}

const KEY = 'maya-cart'

export const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export const saveCart = (items: CartItem[]) => {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(items))
}

export const addToCart = (dish: any, traySize: 'half' | 'medium' | 'full'): CartItem[] => {
  const items = getCart()
  const id = `${dish.id}-${traySize}`
  const priceCents = dish.prices[`${traySize}_cents`]
  const existing = items.find(i => i.id === id)
  const newItems = existing
    ? items.map(i => i.id === id ? { ...i, quantity: i.quantity + 1, totalPriceCents: (i.quantity + 1) * priceCents } : i)
    : [...items, { id, dishId: dish.id, dishName: dish.name, cuisineRegion: dish.cuisine_region, traySize, quantity: 1, unitPriceCents: priceCents, totalPriceCents: priceCents }]
  saveCart(newItems)
  return newItems
}

export const updateQty = (id: string, qty: number): CartItem[] => {
  const newItems = qty <= 0 ? getCart().filter(i => i.id !== id) : getCart().map(i => i.id === id ? { ...i, quantity: qty, totalPriceCents: qty * i.unitPriceCents } : i)
  saveCart(newItems)
  return newItems
}

export const clearCart = () => { if (typeof window !== 'undefined') localStorage.removeItem(KEY) }

export const getCartTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((s, i) => s + i.totalPriceCents, 0)
  const tax = Math.round(subtotal * 0.0625)
  return { subtotal, tax, total: subtotal + tax, count: items.reduce((s, i) => s + i.quantity, 0) }
}
