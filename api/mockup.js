// api/mockup.js — debug version to see full Gemini response structure

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            imageConfig: { aspectRatio: '1:1' }
          }
        })
      }
    )

    const data = await response.json()
    console.log('Status:', response.status)

    // Log the FULL structure so we can see exactly what comes back
    const candidate = data.candidates?.[0]
    const parts = candidate?.content?.parts || []
    console.log('Num parts:', parts.length)
    parts.forEach((p, i) => {
      console.log(`Part ${i} keys:`, Object.keys(p).join(', '))
      if (p.text !== undefined) console.log(`Part ${i} text:`, p.text?.slice(0, 80))
      if (p.inline_data) console.log(`Part ${i} inline_data mime:`, p.inline_data.mime_type, 'data length:', p.inline_data.data?.length)
      if (p.inlineData) console.log(`Part ${i} inlineData mime:`, p.inlineData.mimeType, 'data length:', p.inlineData.data?.length)
    })
    console.log('Finish reason:', candidate?.finishReason)
    if (data.error) console.log('Error:', JSON.stringify(data.error))

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })
    }

    // Try both snake_case and camelCase (SDK vs REST difference)
    const imagePart = parts.find(p => p.inline_data?.data || p.inlineData?.data)

    if (imagePart) {
      const b64 = imagePart.inline_data?.data || imagePart.inlineData?.data
      const mime = imagePart.inline_data?.mime_type || imagePart.inlineData?.mimeType || 'image/png'
      console.log('SUCCESS — got image!')
      return res.status(200).json({ b64, mimeType: mime })
    }

    return res.status(500).json({ error: 'No image in response' })

  } catch (err) {
    console.error('Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
