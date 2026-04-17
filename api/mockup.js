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

  // Model priority: newest to most compatible
  const models = [
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation'
  ]

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `Create a professional product mockup photo. ${prompt} Use the exact product shown in the reference image. Output must be a photorealistic image.`
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

      const data = await response.json()
      console.log(`${model} status: ${response.status}`)

      if (!response.ok) {
        console.log(`${model} failed: ${data.error?.message?.slice(0, 80)}`)
        continue
      }

      const parts = data.candidates?.[0]?.content?.parts || []
      const imagePart = parts.find(p => p.inline_data?.data)

      if (imagePart) {
        console.log(`${model} SUCCESS — got image!`)
        return res.status(200).json({
          b64: imagePart.inline_data.data,
          mimeType: imagePart.inline_data.mime_type || 'image/png'
        })
      }

      const textPart = parts.find(p => p.text)
      console.log(`${model} returned text instead: ${textPart?.text?.slice(0, 80)}`)

    } catch (err) {
      console.error(`${model} exception: ${err.message}`)
    }
  }

  return res.status(500).json({ error: 'No image generated' })
}
