// api/generate.js
// Proxy for Anthropic API calls — keeps API key server-side

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('No Anthropic API key found')
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.json()
    console.log('Anthropic response status:', response.status)
    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data))
    }
    return res.status(response.status).json(data)
  } catch (err) {
    console.error('Anthropic proxy error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
