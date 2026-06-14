import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ received: true })

  try {
    const { stripe } = await import('@/lib/stripe')
    const { supabaseAdmin } = await import('@/lib/supabase')
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      if (session.metadata?.order_id) {
        await supabaseAdmin.from('orders').update({ status: 'confirmed', stripe_payment_status: 'paid' }).eq('id', session.metadata.order_id)
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  return NextResponse.json({ received: true })
}
