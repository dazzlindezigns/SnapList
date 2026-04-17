// api/mockup.js
// Proxy for Google Gemini 2.5 Flash Image generation

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Generate a photorealistic product mockup image. ${prompt} Use the provided product image as the exact product to place in the scene. Output only the image, no text.`
              },
              {
                inline_data: { mime_type: mimeType, data: imageBase64 }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 1,
            topP: 0.95
          }
        })
      }
    )

    const data = await response.json()
    console.log('Gemini status:', response.status)

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data).slice(0, 300))
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' })
    }

    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inline_data?.data)

    if (!imagePart) {
      const textPart = parts.find(p => p.text)
      console.error('No image — got text:', textPart?.text?.slice(0, 150))
      return res.status(500).json({ error: 'No image generated', detail: textPart?.text?.slice(0, 100) })
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
