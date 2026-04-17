// api/mockup.js
// Proxy for OpenAI image generation — keeps API key server-side

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

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (err) {
    console.error('OpenAI proxy error:', err)
    return res.status(500).json({ error: 'Failed to generate mockup' })
  }
}
