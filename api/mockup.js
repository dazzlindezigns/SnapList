// api/mockup.js — Google Gemini image generation

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { prompt, imageBase64, mimeType = 'image/jpeg' } = req.body

  // gemini-3.1-flash-image-preview = Nano Banana 2 (confirmed working in your AI Studio)
  const model = 'gemini-3.1-flash-image-preview'

  try {
    console.log(`Calling ${model}...`)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55000) // 55s timeout, under Vercel's 60s limit

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Create a professional product mockup photo. ${prompt} Use the exact product shown in the reference image. The product must be clearly visible and realistic.`
              },
              {
                inline_data: { mime_type: mimeType, data: imageBase64 }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT']
          }
        })
      }
    )

    clearTimeout(timeout)

    const data = await response.json()
    console.log(`${model} status: ${response.status}`)

    if (!response.ok) {
      console.error(`${model} error: ${data.error?.message?.slice(0, 100)}`)
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })
    }

    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inline_data?.data)

    if (imagePart) {
      console.log(`SUCCESS — got image from ${model}`)
      return res.status(200).json({
        b64: imagePart.inline_data.data,
        mimeType: imagePart.inline_data.mime_type || 'image/png'
      })
    }

    const textPart = parts.find(p => p.text)
    console.error(`No image — got text: ${textPart?.text?.slice(0, 100)}`)
    return res.status(500).json({ error: 'Model returned text instead of image' })

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Request timed out after 55s')
      return res.status(504).json({ error: 'Image generation timed out — please try again' })
    }
    console.error(`Exception: ${err.message}`)
    return res.status(500).json({ error: err.message })
  }
}
