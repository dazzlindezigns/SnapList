// api/mockup.js — Gemini image generation matching working app exactly

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const { prompt, imageBase64, mimeType = 'image/jpeg' } = req.body

  try {
    // Match working app EXACTLY:
    // 1. Image parts FIRST, text LAST
    // 2. Use imageConfig not generationConfig/responseModalities
    // 3. Model: gemini-2.5-flash-image
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              // Image FIRST
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              // Text LAST
              { text: prompt }
            ]
          }],
          // imageConfig, NOT generationConfig — matching working app exactly
          generationConfig: {
            imageConfig: { aspectRatio: '1:1' }
          }
        })
      }
    )

    const data = await response.json()
    console.log('Gemini status:', response.status)

    if (!response.ok) {
      console.error('Gemini error:', data.error?.message)
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })
    }

    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inline_data?.data)

    if (imagePart) {
      console.log('SUCCESS — got image!')
      return res.status(200).json({
        b64: imagePart.inline_data.data,
        mimeType: imagePart.inline_data.mime_type || 'image/png'
      })
    }

    const textPart = parts.find(p => p.text)
    console.error('No image — text:', textPart?.text?.slice(0, 100))
    return res.status(500).json({ error: 'No image generated' })

  } catch (err) {
    console.error('Proxy error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
