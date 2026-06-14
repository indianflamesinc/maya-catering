import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, customerName, customerEmail, customerPhone, pickupDate, pickupTime, notes } = body

    if (!items?.length || !customerEmail || !pickupDate || !pickupTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if Stripe key is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('PASTE')) {
      // Demo mode: return mock success URL
      return NextResponse.json({ 
        url: `/order/confirmation?order_id=demo-${Date.now()}&session_id=demo` 
      })
    }

    const { stripe } = await import('@/lib/stripe')
    const { supabaseAdmin } = await import('@/lib/supabase')

    const subtotal = items.reduce((s: number, i: any) => s + i.totalPriceCents, 0)
    const tax = Math.round(subtotal * 0.0625)

    // Save order to DB
    const { data: order } = await supabaseAdmin.from('orders').insert({
      customer_name: customerName, customer_email: customerEmail,
      customer_phone: customerPhone, status: 'pending',
      pickup_date: pickupDate, pickup_time: pickupTime,
      subtotal_cents: subtotal, tax_cents: tax, total_cents: subtotal + tax, notes,
    }).select().single()

    if (order) {
      await supabaseAdmin.from('order_items').insert(
        items.map((i: any) => ({
          order_id: order.id, dish_name: i.dishName, cuisine_region: i.cuisineRegion,
          tray_size: i.traySize, quantity: i.quantity,
          unit_price_cents: i.unitPriceCents, total_price_cents: i.totalPriceCents,
        }))
      )
    }

    const lineItems = [
      ...items.map((i: any) => ({
        price_data: { currency: 'usd', product_data: { name: `${i.dishName} — ${i.traySize === 'half' ? 'Half' : i.traySize === 'medium' ? 'Medium' : 'Full'} Tray` }, unit_amount: i.unitPriceCents },
        quantity: i.quantity,
      })),
      { price_data: { currency: 'usd', product_data: { name: 'MA Sales Tax (6.25%)' }, unit_amount: tax }, quantity: 1 },
    ]

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      metadata: { order_id: order?.id || 'unknown' },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/confirmation?order_id=${order?.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/checkout?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 })
  }
}
