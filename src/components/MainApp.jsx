import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

const PLATFORMS = ['Etsy', 'Shopify', 'Amazon Handmade', 'Own Website', 'Payhip', 'Beacons', 'TikTok Shop', 'Facebook Shop']

const MOCKUP_PROMPTS = [
  'professional product photo on clean white background, studio lighting, e-commerce style',
  'lifestyle product photo on rustic wooden table with soft natural light',
  'product displayed on marble surface with minimalist styling, overhead flat lay',
  'cozy home setting lifestyle shot, warm bokeh background, natural window light',
  'gift wrapping scene, product with ribbon and kraft paper, festive styling',
  'product photo with green plants and natural props, earthy aesthetic',
  'close-up detail shot showing texture and craftsmanship, macro photography style',
  'product on neutral linen fabric background, soft shadows, artisan feel',
  'outdoor lifestyle scene, natural sunlight, product in use',
  'dark moody aesthetic, product on dark slate with dramatic side lighting',
]

export default function MainApp() {
  const navigate = useNavigate()
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [platform, setPlatform] = useState('Etsy')
  const [drag, setDrag] = useState(false)
  const [listingLoading, setListingLoading] = useState(false)
  const [mockupLoading, setMockupLoading] = useState(false)
  const [mockupProgress, setMockupProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [mockups, setMockups] = useState([])
  const [copied, setCopied] = useState({})
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setImage(URL.createObjectURL(file))
    setResult(null)
    setMockups([])
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1024
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })

  const generateListing = async () => {
    if (!imageFile) return
    setListingLoading(true)
    setResult(null)
    try {
      const b64 = await toBase64(imageFile)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: 'You are a product listing expert. You ONLY respond with valid JSON. No markdown, no backticks, no explanation, no text before or after the JSON object.',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
              { type: 'text', text: `Analyze this product image and generate an optimized listing for ${platform}. Respond with ONLY this JSON structure: {"title":"SEO title under 140 chars","description":"3 paragraphs about this product","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13"],"category":"product category","price_suggestion":"$XX-$XX","occasion_tags":["tag1","tag2","tag3","tag4","tag5"]}` }
            ]
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      let parsed = null
      try { parsed = JSON.parse(text) } catch {}
      if (!parsed) {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
        try { parsed = JSON.parse(clean) } catch {}
      }
      if (!parsed) {
        const match = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/)
        if (match) try { parsed = JSON.parse(match[0]) } catch {}
      }
      if (!parsed) throw new Error('Could not parse response')
      setResult(parsed)
    } catch (err) {
      console.error('Listing error:', err.message)
      setResult({ error: 'Something went wrong — please try again.' })
    }
    setListingLoading(false)
  }

  const generateMockups = async () => {
    if (!imageFile) return
    setMockupLoading(true)
    setMockups([])
    setMockupProgress(0)

    const b64 = await toBase64(imageFile)
    const generated = []
    const BATCH_SIZE = 3

    for (let i = 0; i < MOCKUP_PROMPTS.length; i += BATCH_SIZE) {
      const batch = MOCKUP_PROMPTS.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (promptText, j) => {
          const prompt = `Take this product and place it naturally into the following scene: ${promptText}. Keep the product looking exactly as it does in the photo. Professional product photography, high quality, realistic lighting.`
          const res = await fetch('/api/mockup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, imageBase64: b64, mimeType: 'image/jpeg' })
          })
          const data = await res.json()
          if (data.b64) {
            return { url: `data:${data.mimeType || 'image/png'};base64,${data.b64}`, label: promptText.split(',')[0] }
          }
          return null
        })
      )

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          generated.push(r.value)
        }
      })
      setMockups([...generated])
      setMockupProgress(Math.min(i + BATCH_SIZE, MOCKUP_PROMPTS.length))
    }
    setMockupLoading(false)
  }

  const copy = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopied(p => ({ ...p, [key]: true }))
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000)
  }

  const s = {
    topbar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1rem 1.75rem',
      borderBottom: '1px solid #f0f0f0',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 10,
      boxShadow: '0 2px 20px rgba(0,0,0,0.05)'
    },
    signout: {
      fontSize: 13, color: '#888', background: 'none',
      border: '1.5px solid #e8e8e8', borderRadius: 8,
      padding: '6px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: 'all .15s', fontWeight: 600
    },
    workspace: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '2rem', maxWidth: 1200, margin: '0 auto', padding: '2rem',
      background: '#FAFAFA', minHeight: 'calc(100vh - 60px)'
    },
    secLabel: {
      fontSize: 10, fontWeight: 700, letterSpacing: '.18em',
      textTransform: 'uppercase', color: '#bbb', marginBottom: 12
    },
    uploadZone: {
      border: `2px dashed ${drag ? '#9171BD' : 'rgba(145,113,189,0.25)'}`,
      borderRadius: 18, padding: '2rem',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1rem', cursor: 'pointer', minHeight: 220,
      background: drag ? 'rgba(145,113,189,0.05)' : '#fff',
      transition: 'all .2s', position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    },
    outCard: {
      background: '#fff', border: '1.5px solid #f0f0f0',
      borderRadius: 14, padding: '1.25rem', marginBottom: 12,
      animation: 'fadeUp .35s ease both',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
    },
    outHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    outLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#bbb' },
    copyBtn: {
      fontSize: 12, color: '#9171BD', background: 'none', border: 'none',
      cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700, padding: 0, transition: 'opacity .15s'
    },
    pill: (type) => ({
      fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
      ...(type === 'purple' ? { background: 'rgba(145,113,189,0.1)', color: '#7c5cbf', border: '1.5px solid rgba(145,113,189,0.2)' } :
          { background: 'rgba(255,102,196,0.1)', color: '#cc44a0', border: '1.5px solid rgba(255,102,196,0.2)' })
    }),
    empty: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 300, gap: 14,
      border: '2px dashed #e8e8e8', borderRadius: 18,
      color: '#ccc', fontSize: 14, textAlign: 'center', padding: '2rem',
      background: '#fafafa'
    },
    mockupGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12
    },
    mockupCard: {
      borderRadius: 10, overflow: 'hidden', aspectRatio: '1',
      background: '#f5f5f5', border: '1.5px solid #f0f0f0',
      position: 'relative'
    }
  }

  return (
    <div>
      <div style={s.topbar}>
        <Logo size={32} fontSize={20} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
            background: 'linear-gradient(135deg, rgba(145,113,189,0.12), rgba(255,102,196,0.1))',
            color: '#9171BD',
            border: '1.5px solid rgba(145,113,189,0.2)', padding: '5px 14px', borderRadius: 20
          }}>✨ Lifetime Access</span>
          <button style={s.signout} onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>Sign out</button>
        </div>
      </div>

      <div className="workspace" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        {/* LEFT PANEL */}
        <div>
          <p style={s.secLabel}>Your Product Photo</p>
          <div style={s.uploadZone}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*"
              onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
            {image ? (
              <img src={image} alt="Product" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 260 }} />
            ) : (
              <>
                <div style={{
                  width: 54, height: 54, borderRadius: 14,
                  background: 'linear-gradient(135deg,rgba(145,113,189,0.12),rgba(255,102,196,0.08))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                }}>📸</div>
                <p style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 1.65 }}>
                  <strong style={{ color: '#9171BD' }}>Click to upload</strong> or drag & drop<br />JPG, PNG, WEBP
                </p>
              </>
            )}
          </div>

          {image && (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={s.secLabel}>Selling On</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)} style={{
                    padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    border: platform === p ? '2px solid #9171BD' : '1.5px solid #e8e8e8',
                    background: platform === p ? '#9171BD' : '#fff',
                    color: platform === p ? '#fff' : '#888',
                    transition: 'all .15s'
                  }}>{p}</button>
                ))}
              </div>

              {/* Single Generate Button — triggers both listing + mockups */}
              <button onClick={async () => { await generateListing(); generateMockups() }} 
                disabled={listingLoading || mockupLoading} style={{
                width: '100%', padding: '15px 24px',
                background: 'linear-gradient(135deg, #9171BD, #FF66C4)',
                color: '#fff', border: 'none', borderRadius: 14,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15, fontWeight: 700, 
                cursor: (listingLoading || mockupLoading) ? 'not-allowed' : 'pointer',
                opacity: (listingLoading || mockupLoading) ? 0.5 : 1, transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 6px 20px rgba(145,113,189,0.35)'
              }}>
                {listingLoading ? (
                  <><span className="spinner" />Generating listing...</>
                ) : mockupLoading ? (
                  <><span className="spinner" />Generating mockups ({mockupProgress}/10)...</>
                ) : (
                  <>✨ Generate Listing + Mockups</>
                )}
              </button>
            </div>
          )}

          {/* Mockups — left panel, below generate button */}
          {(mockups.length > 0 || mockupLoading) && (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={s.secLabel}>
                Product Mockups ({mockups.length}/10){mockupLoading ? ' — generating...' : ''}
              </p>
              <div style={s.mockupGrid}>
                {mockups.map((m, i) => (
                  <div key={i} style={s.mockupCard}>
                    <img src={m.url} alt={m.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 7px', borderRadius: 4 }}>{m.label}</div>
                    <a href={m.url} download={`mockup-${i+1}.png`} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, background: 'rgba(145,113,189,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>↓ Save</a>
                  </div>
                ))}
                {mockupLoading && Array.from({ length: Math.min(3, 10 - mockups.length) }).map((_, i) => (
                  <div key={`sk-${i}`} style={{ ...s.mockupCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="spinner-dark" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — listing only */}
        <div>
          {/* Listing output */}
          <p style={s.secLabel}>Generated Listing</p>

          {!result && !listingLoading && (
            <div style={s.empty}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, rgba(145,113,189,0.1), rgba(255,102,196,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>✨</div>
              <p style={{ color: '#aaa' }}>Upload a photo and tap Generate<br />to build your listing instantly.</p>
            </div>
          )}

          {listingLoading && (
            <div style={s.empty}>
              <span className="spinner-dark" style={{ width: 28, height: 28 }} />
              <p style={{ color: '#aaa' }}>Reading your product...</p>
            </div>
          )}

          {result && !result.error && (
            <>
              <div style={s.outCard}>
                <div style={s.outHeader}>
                  <span style={s.outLabel}>Title</span>
                  <button style={s.copyBtn} onClick={() => copy('title', result.title)}>{copied.title ? 'Copied!' : 'Copy'}</button>
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1.45, color: '#1a1a2e' }}>{result.title}</p>
              </div>

              <div style={s.outCard}>
                <div style={s.outHeader}>
                  <span style={s.outLabel}>Description</span>
                  <button style={s.copyBtn} onClick={() => copy('desc', result.description)}>{copied.desc ? 'Copied!' : 'Copy'}</button>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: '#555', whiteSpace: 'pre-wrap' }}>{result.description}</p>
              </div>

              <div style={s.outCard}>
                <div style={s.outHeader}>
                  <span style={s.outLabel}>Keywords</span>
                  <button style={s.copyBtn} onClick={() => copy('kw', result.keywords?.join(', '))}>{copied.kw ? 'Copied!' : 'Copy all'}</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.keywords?.map((k, i) => <span key={i} style={s.pill('purple')}>{k}</span>)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[['Category', result.category], ['Price Suggestion', result.price_suggestion]].map(([label, val]) => (
                  <div key={label} style={{ background: '#fff', border: '1.5px solid #f0f0f0', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 10, color: '#bbb', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 5, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{val}</div>
                  </div>
                ))}
              </div>

              {result.occasion_tags?.length > 0 && (
                <div style={s.outCard}>
                  <div style={s.outHeader}><span style={s.outLabel}>Occasion Tags</span></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.occasion_tags.map((t, i) => <span key={i} style={s.pill('pink')}>{t}</span>)}
                  </div>
                </div>
              )}
            </>
          )}

          {result?.error && (
            <div style={s.outCard}>
              <p style={{ color: 'var(--pink)', fontSize: 14 }}>{result.error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 780px) {
          .workspace { 
            grid-template-columns: 1fr !important; 
            padding: 1rem !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}
