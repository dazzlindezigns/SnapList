// api/webhook.js
// This is a Vercel serverless function
// It receives Stripe webhook events and marks users as paid in Supabase

import { createClient } from '@supabase/supabase-js'

// Use service role key here (not publishable) - set in Vercel env vars
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const event = req.body

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerEmail = session.customer_details?.email || session.customer_email

    if (!customerEmail) {
      return res.status(400).json({ error: 'No email found' })
    }

    // Find the user by email in Supabase Auth
    const { data: users } = await supabase.auth.admin.listUsers()
    const matchedUser = users?.users?.find(u => u.email === customerEmail)

    if (matchedUser) {
      // User already has an account — mark as paid
      await supabase
        .from('profiles')
        .upsert({ id: matchedUser.id, is_paid: true })
    } else {
      // User hasn't created an account yet
      // Store their email so when they sign up, we can mark them paid
      // You can handle this with a separate "pending_purchases" table
      // For now, log it — you can manually mark them after they sign up
      console.log(`Purchase from ${customerEmail} — no account yet`)
    }
  }

  res.status(200).json({ received: true })
}
