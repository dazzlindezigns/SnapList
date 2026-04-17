// api/mockup.js
// Proxy for Google Gemini image generation — places actual product into lifestyle scenes

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

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    console.error('No Google AI API key found')
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { prompt, imageBase64, mimeType = 'image/jpeg' } = req.body

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1' }
          }
        })
      }
    )

    const data = await response.json()
    console.log('Gemini response status:', response.status)

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data))
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' })
    }

    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inline_data?.data)

    if (!imagePart) {
      console.error('No image in Gemini response:', JSON.stringify(data))
      return res.status(500).json({ error: 'No image generated' })
    }

    return res.status(200).json({
      b64: imagePart.inline_data.data,
      mimeType: imagePart.inline_data.mime_type || 'image/png'
    })

  } catch (err) {
    console.error('Gemini proxy error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
