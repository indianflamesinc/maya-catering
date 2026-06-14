export type TraySize = 'half' | 'medium' | 'full'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'collected' | 'cancelled'
export type EventStatus = 'inquiry' | 'proposal_sent' | 'contract_sent' | 'deposit_paid' | 'confirmed' | 'completed' | 'cancelled'

export interface MenuDish {
  id: string
  name: string
  description?: string
  cuisine_region: string
  category: string
  is_veg: boolean
  is_active: boolean
  prices: { half_cents: number; medium_cents: number; full_cents: number }
  sort_order?: number
}

export interface Order {
  id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  status: OrderStatus
  pickup_date: string
  pickup_time: string
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  stripe_payment_intent_id?: string
  stripe_payment_status?: string
  notes?: string
  order_items?: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  dish_name: string
  cuisine_region?: string
  tray_size: TraySize
  quantity: number
  unit_price_cents: number
  total_price_cents: number
}

export interface Event {
  id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  type: string
  event_date: string
  venue?: string
  guest_count: number
  status: EventStatus
  cuisine_preferences?: string[]
  special_requirements?: string
  created_at: string
}
