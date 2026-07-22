// api/video.js — Product video generation via Google Veo
// action: 'start'  → kicks off video generation, returns operation name
// action: 'status' → polls the operation; when done, downloads the video
//                    and uploads it to Supabase Storage, returns public URL

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 300
}

const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const VEO_MODEL = 'veo-3.0-fast-generate-001'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const { action } = req.body || {}

  try {
    if (action === 'start') {
      const { prompt, imageBase64, mimeType = 'image/jpeg' } = req.body
      if (!prompt || !imageBase64) {
        return res.status(400).json({ error: 'Missing prompt or image' })
      }

      const response = await fetch(`${GOOGLE_BASE}/models/${VEO_MODEL}:predictLongRunning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          instances: [{
            prompt,
            image: { bytesBase64Encoded: imageBase64, mimeType }
          }],
          parameters: { aspectRatio: '9:16', personGeneration: 'allow_adult' }
        })
      })
      const data = await response.json()
      console.log('Veo start status:', response.status)
      if (!response.ok || !data.name) {
        console.error('Veo start error:', JSON.stringify(data).slice(0, 500))
        return res.status(response.ok ? 500 : response.status)
          .json({ error: data.error?.message || 'Could not start video generation' })
      }
      return res.status(200).json({ operation: data.name })
    }

    if (action === 'status') {
      const { operation, path, accessToken } = req.body
      if (!operation || !/^models\/[\w.-]+\/operations\/[\w-]+$/.test(operation)) {
        return res.status(400).json({ error: 'Invalid operation' })
      }

      const opRes = await fetch(`${GOOGLE_BASE}/${operation}`, {
        headers: { 'x-goog-api-key': apiKey }
      })
      const op = await opRes.json()
      if (op.error) {
        console.error('Veo operation error:', JSON.stringify(op.error))
        return res.status(500).json({ error: op.error.message || 'Video generation failed' })
      }
      if (!op.done) return res.status(200).json({ done: false })

      // Handle both REST response shapes
      const sample = op.response?.generateVideoResponse?.generatedSamples?.[0]
        || op.response?.generatedVideos?.[0]
      const uri = sample?.video?.uri
      if (!uri) {
        console.error('Veo done but no video:', JSON.stringify(op.response || {}).slice(0, 500))
        return res.status(500).json({ error: 'Video was blocked or not returned — try a different photo' })
      }
      if (!uri.startsWith('https://generativelanguage.googleapis.com/')) {
        return res.status(500).json({ error: 'Unexpected video location' })
      }

      if (!path || !accessToken || path.includes('..')) {
        return res.status(400).json({ error: 'Invalid storage path' })
      }
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
      if (!supabaseUrl || !anonKey) {
        return res.status(500).json({ error: 'Storage not configured' })
      }

      // Download the video from Google (requires API key), then store in Supabase
      const videoRes = await fetch(uri, { headers: { 'x-goog-api-key': apiKey } })
      if (!videoRes.ok) {
        return res.status(500).json({ error: 'Could not download generated video' })
      }
      const buffer = Buffer.from(await videoRes.arrayBuffer())
      console.log('Downloaded video bytes:', buffer.length)

      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/mockups/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
          'Content-Type': 'video/mp4',
          'x-upsert': 'true'
        },
        body: buffer
      })
      if (!uploadRes.ok) {
        const text = await uploadRes.text()
        console.error('Supabase upload error:', text.slice(0, 300))
        return res.status(500).json({ error: 'Could not save video to storage' })
      }

      return res.status(200).json({
        done: true,
        url: `${supabaseUrl}/storage/v1/object/public/mockups/${path}`
      })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('Video API error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
