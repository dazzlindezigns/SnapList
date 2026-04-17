import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

const PLATFORMS = ['Etsy', 'Shopify', 'Amazon Handmade', 'Own Website', 'Facebook Shop']

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

export default function MainApp({ user, onSignOut }) {
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
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
              { type: 'text', text: `You are a product listing expert for handmade and craft sellers. Analyze this product image and generate a complete optimized listing for ${platform}. Return ONLY a valid JSON object with no markdown, no backticks, no preamble:\n{"title":"SEO-optimized title under 140 chars","description":"3 paragraphs: emotional appeal, product details/materials/sizing, gift angle + CTA","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13"],"category":"best product category for ${platform}","price_suggestion":"$XX–$XX","occasion_tags":["tag1","tag2","tag3","tag4","tag5"]}` }
            ]
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      setResult(JSON.parse(jsonMatch[0]))
    } catch {
      setResult({ error: 'Something went wrong — please try again.' })
    }
    setListingLoading(false)
  }

  const generateMockups = async () => {
    if (!imageFile) return
    setMockupLoading(true)
    setMockups([])
    setMockupProgress(0)

    const generated = []
    for (let i = 0; i < MOCKUP_PROMPTS.length; i++) {
      try {
        const prompt = `Handmade craft product mockup: ${MOCKUP_PROMPTS[i]}. The product is a handmade item. Clean, professional, high quality product photography.`
        const res = await fetch('/api/mockup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard'
          })
        })
        const data = await res.json()
        if (data.data?.[0]?.url) {
          generated.push({ url: data.data[0].url, label: MOCKUP_PROMPTS[i].split(',')[0] })
          setMockups([...generated])
        }
      } catch {
        // skip failed mockup, continue
      }
      setMockupProgress(i + 1)
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
      borderBottom: '1px solid var(--border)',
      background: 'rgba(26,23,32,0.92)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 10
    },
    signout: {
      fontSize: 13, color: 'var(--muted)', background: 'none',
      border: '1px solid var(--border)', borderRadius: 8,
      padding: '6px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: 'all .15s'
    },
    workspace: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '2rem', maxWidth: 1200, margin: '0 auto', padding: '2rem'
    },
    secLabel: {
      fontSize: 10, fontWeight: 600, letterSpacing: '.18em',
      textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12
    },
    uploadZone: {
      border: `1.5px dashed ${drag ? 'var(--purple)' : 'rgba(145,113,189,0.3)'}`,
      borderRadius: 18, padding: '2rem',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1rem', cursor: 'pointer', minHeight: 220,
      background: drag ? 'rgba(145,113,189,0.09)' : 'rgba(145,113,189,0.04)',
      transition: 'all .2s', position: 'relative', overflow: 'hidden'
    },
    outCard: {
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.25rem', marginBottom: 12,
      animation: 'fadeUp .35s ease both'
    },
    outHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    outLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)' },
    copyBtn: {
      fontSize: 12, color: 'var(--purple)', background: 'none', border: 'none',
      cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 500, padding: 0, transition: 'opacity .15s'
    },
    pill: (type) => ({
      fontSize: 12, fontWeight: 500, padding: '4px 11px', borderRadius: 20,
      ...(type === 'purple' ? { background: 'rgba(145,113,189,0.15)', color: '#c4aee8', border: '1px solid rgba(145,113,189,0.25)' } :
          { background: 'rgba(255,102,196,0.12)', color: '#ffaadf', border: '1px solid rgba(255,102,196,0.2)' })
    }),
    empty: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 300, gap: 14,
      border: '1px solid var(--border)', borderRadius: 18,
      color: 'var(--faint)', fontSize: 14, textAlign: 'center', padding: '2rem'
    },
    mockupGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12
    },
    mockupCard: {
      borderRadius: 10, overflow: 'hidden', aspectRatio: '1',
      background: '#1a1720', border: '1px solid var(--border)',
      position: 'relative'
    }
  }

  return (
    <div>
      <div style={s.topbar}>
        <Logo size={32} fontSize={20} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase',
            background: 'rgba(145,113,189,0.15)', color: 'var(--purple)',
            border: '1px solid rgba(145,113,189,0.3)', padding: '4px 12px', borderRadius: 20
          }}>Lifetime Access</span>
          <button style={s.signout} onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      <div style={s.workspace}>
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
                  background: 'linear-gradient(135deg,rgba(145,113,189,0.2),rgba(255,102,196,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                }}>📸</div>
                <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--purple)' }}>Click to upload</strong> or drag & drop<br />JPG, PNG, WEBP
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
                    padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    border: platform === p ? '1px solid var(--purple)' : '1px solid var(--border)',
                    background: platform === p ? 'var(--purple)' : 'transparent',
                    color: platform === p ? '#fff' : 'var(--muted)',
                    transition: 'all .15s'
                  }}>{p}</button>
                ))}
              </div>

              {/* Generate Listing */}
              <button onClick={generateListing} disabled={listingLoading} style={{
                width: '100%', padding: '15px 24px', marginBottom: 10,
                background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                color: '#fff', border: 'none', borderRadius: 14,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15, fontWeight: 600, cursor: listingLoading ? 'not-allowed' : 'pointer',
                opacity: listingLoading ? 0.5 : 1, transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
                {listingLoading ? <><span className="spinner" />Analyzing your product...</> : <>✦ Generate Listing</>}
              </button>

              {/* Generate Mockups */}
              <button onClick={generateMockups} disabled={mockupLoading} style={{
                width: '100%', padding: '13px 24px',
                background: 'transparent',
                color: 'var(--blue)', border: '1px solid rgba(56,182,255,0.3)',
                borderRadius: 14,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14, fontWeight: 600, cursor: mockupLoading ? 'not-allowed' : 'pointer',
                opacity: mockupLoading ? 0.5 : 1, transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
                {mockupLoading
                  ? <><span className="spinner" style={{ borderTopColor: 'var(--blue)', borderColor: 'rgba(56,182,255,0.2)' }} />
                    Generating mockups ({mockupProgress}/10)...</>
                  : <>✦ Generate 10 Mockups</>}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div>
          {/* Mockups */}
          {mockups.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={s.secLabel}>Product Mockups ({mockups.length}/10)</p>
              <div style={s.mockupGrid}>
                {mockups.map((m, i) => (
                  <div key={i} style={s.mockupCard}>
                    <img src={m.url} alt={m.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', bottom: 6, left: 6,
                      fontSize: 10, background: 'rgba(0,0,0,0.65)',
                      color: 'rgba(255,255,255,0.8)', padding: '2px 7px', borderRadius: 4
                    }}>{m.label}</div>
                    <a href={m.url} download={`mockup-${i + 1}.png`} target="_blank" rel="noopener noreferrer"
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        fontSize: 10, background: 'rgba(145,113,189,0.8)',
                        color: '#fff', padding: '3px 8px', borderRadius: 4,
                        textDecoration: 'none', fontWeight: 500
                      }}>↓ Save</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listing output */}
          <p style={s.secLabel}>Generated Listing</p>

          {!result && !listingLoading && mockups.length === 0 && (
            <div style={s.empty}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(145,113,189,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26
              }}>✦</div>
              <p>Upload a photo and tap Generate<br />to build your listing instantly.</p>
            </div>
          )}

          {listingLoading && (
            <div style={s.empty}>
              <span className="spinner" style={{ width: 28, height: 28, borderColor: 'rgba(145,113,189,0.3)', borderTopColor: 'var(--purple)' }} />
              <p>Reading your product...</p>
            </div>
          )}

          {result && !result.error && (
            <>
              <div style={s.outCard}>
                <div style={s.outHeader}>
                  <span style={s.outLabel}>Title</span>
                  <button style={s.copyBtn} onClick={() => copy('title', result.title)}>{copied.title ? 'Copied!' : 'Copy'}</button>
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1.45 }}>{result.title}</p>
              </div>

              <div style={s.outCard}>
                <div style={s.outHeader}>
                  <span style={s.outLabel}>Description</span>
                  <button style={s.copyBtn} onClick={() => copy('desc', result.description)}>{copied.desc ? 'Copied!' : 'Copy'}</button>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(244,240,255,0.65)', whiteSpace: 'pre-wrap' }}>{result.description}</p>
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
                  <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{val}</div>
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
          .workspace { grid-template-columns: 1fr !important; padding: 1.25rem !important; }
        }
      `}</style>
    </div>
  )
}
