// api/webhook.js
// Vercel serverless function — receives Stripe webhook, marks users as paid in Supabase

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = {
  api: { bodyParser: false }
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerEmail = session.customer_details?.email || session.customer_email

    if (!customerEmail) {
      return res.status(400).json({ error: 'No email found' })
    }

    console.log(`Payment received from: ${customerEmail}`)

    // Look up user in Supabase Auth
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const matchedUser = users?.find(u => u.email.toLowerCase() === customerEmail.toLowerCase())

    if (matchedUser) {
      // User has an account — mark as paid immediately
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: matchedUser.id, is_paid: true })

      if (error) {
        console.error('Failed to update profile:', error)
        return res.status(500).json({ error: 'Failed to update profile' })
      }
      console.log(`Marked ${customerEmail} as paid`)
    } else {
      // No account yet — store in pending_purchases table
      // When they sign up later, the trigger will check this table
      const { error } = await supabase
        .from('pending_purchases')
        .upsert({ email: customerEmail.toLowerCase(), purchased_at: new Date().toISOString() })

      if (error) {
        console.error('Failed to store pending purchase:', error)
      }
      console.log(`Stored pending purchase for ${customerEmail}`)
    }
  }

  res.status(200).json({ received: true })
}
