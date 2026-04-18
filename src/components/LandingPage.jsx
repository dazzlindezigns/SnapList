import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const PLATFORMS = ['Etsy', 'Shopify', 'Own Website', 'Payhip', 'Beacons', 'TikTok Shop', 'Facebook Shop']
const STRIPE_URL = import.meta.env.VITE_STRIPE_URL || 'https://buy.stripe.com/PLACEHOLDER'

const HOW_IT_WORKS = [
  { emoji: '📸', title: 'Snap your product', body: 'Upload any photo — straight from your phone. No fancy setup needed.' },
  { emoji: '🎯', title: 'Pick your platform', body: 'Etsy, Shopify, TikTok Shop, your own site — we optimize for where you sell.' },
  { emoji: '✨', title: 'Get your full listing', body: 'Title, description, keywords, category & price suggestion — ready to paste.' },
  { emoji: '🖼️', title: 'Get 10 AI mockups', body: 'Professional product photos in lifestyle scenes — no photoshoot needed.' },
]

const TESTIMONIALS = [
  { name: 'Jasmine T.', role: 'Etsy seller · jewelry', text: 'I used to spend 45 minutes writing each listing. Now it takes 30 seconds. This tool is everything for my shop.' },
  { name: 'Maria R.', role: '3D printing seller', text: 'The keywords it generates are researched-level good. My views went up within the first week.' },
  { name: 'Keisha B.', role: 'Handmade goods · Shopify', text: 'I was skeptical but the free demo convinced me instantly. Best $19 I\'ve spent on my business this year.' },
]

function LogoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="url(#lp-g)"/>
      <path d="M10 14C10 11.8 11.8 10 14 10H22C24.2 10 26 11.8 26 14C26 16.2 24.2 18 22 18H14C11.8 18 10 19.8 10 22C10 24.2 11.8 26 14 26H26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="27" cy="10" r="3" fill="#FF66C4"/>
      <defs><linearGradient id="lp-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#9171BD"/><stop offset="1" stopColor="#6B4FA0"/></linearGradient></defs>
    </svg>
  )
}

function DemoSection({ onBuy }) {
  const DEMO_COOKIE = 'snaplist_demo_used'
  const hasDemoBeenUsed = () => document.cookie.split(';').some(c => c.trim().startsWith(`${DEMO_COOKIE}=`))
  const markDemoUsed = () => {
    const exp = new Date(); exp.setDate(exp.getDate() + 30)
    document.cookie = `${DEMO_COOKIE}=1; expires=${exp.toUTCString()}; path=/`
  }

  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [platform, setPlatform] = useState('Etsy')
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [mockups, setMockups] = useState([])
  const [mockupLoading, setMockupLoading] = useState(false)
  const [used, setUsed] = useState(() => hasDemoBeenUsed())
  const [showUsedMsg, setShowUsedMsg] = useState(false)
  const fileRef = useRef()

  const DEMO_MOCKUP_PROMPTS = [
    'Place this product on a clean white background with soft studio lighting. Professional e-commerce product photography.',
    'Place this product in a cozy lifestyle scene on a rustic wooden table with soft natural window light and warm tones.',
  ]

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (used) { setShowUsedMsg(true); return }
    setImageFile(file); setImage(URL.createObjectURL(file)); setResult(null)
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1024; let w = img.width, h = img.height
      if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX } else { w = Math.round(w * MAX / h); h = MAX } }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = rej; img.src = URL.createObjectURL(file)
  })

  const generateMockups = async (title, b64) => {
    setMockupLoading(true)
    setMockups([])
    const generated = []
    for (const prompt of DEMO_MOCKUP_PROMPTS) {
      try {
        const res = await fetch('/api/mockup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: `${prompt} The product is: ${title}. Keep the product exactly as shown.`, imageBase64: b64, mimeType: 'image/jpeg' })
        })
        const data = await res.json()
        if (data.b64) {
          generated.push(`data:${data.mimeType || 'image/png'};base64,${data.b64}`)
          setMockups([...generated])
        } else {
          console.error('Mockup error:', data.error || 'No image returned')
        }
      } catch (err) {
        console.error('Mockup fetch error:', err.message)
      }
    }
    setMockupLoading(false)
  }

  const generate = async () => {
    if (!imageFile || used) return
    setLoading(true)
    try {
      const b64 = await toBase64(imageFile)
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'You are a product listing expert. You ONLY respond with valid JSON. No markdown, no backticks, no explanation.',
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
            { type: 'text', text: `Analyze this product and generate an optimized listing for ${platform}. JSON only: {"title":"SEO title under 140 chars","description":"3 paragraphs","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13"],"category":"category","price_suggestion":"$XX-$XX"}` }
          ]}]
        })
      })
      const data = await res.json()

      // Surface real API errors
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || data.error || `API error ${res.status}`)
      }
      if (data.type === 'error') {
        throw new Error(data.error?.message || 'API returned an error')
      }

      const text = data.content?.find(b => b.type === 'text')?.text || ''
      if (!text) throw new Error('No response from AI — please try again.')

      let parsed = null
      try { parsed = JSON.parse(text) } catch {}
      if (!parsed) { const clean = text.replace(/```json|```/g, '').trim(); try { parsed = JSON.parse(clean) } catch {} }
      if (!parsed) { const match = text.match(/\{[\s\S]*\}/); if (match) try { parsed = JSON.parse(match[0]) } catch {} }
      if (!parsed) throw new Error('Could not parse response — please try again.')
      setResult(parsed); setUsed(true); markDemoUsed()
      generateMockups(parsed.title || 'handmade product', b64)
    } catch (err) { setResult({ error: err.message || 'Something went wrong — please try again.' }) }
    setLoading(false)
  }

  const pill = { fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: 'rgba(145,113,189,0.1)', color: '#7c5cbf', border: '1.5px solid rgba(145,113,189,0.2)' }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #FF66C4, #9171BD)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, marginBottom: 16 }}>✨ Try it free — no account needed</span>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#1a1a2e', marginBottom: 10 }}>See it work on your product</h2>
        <p style={{ fontSize: 15, color: '#666', maxWidth: 440, margin: '0 auto' }}>Upload a real photo. Get a real listing. One try, on us.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="demo-grid">
        <div>
          <div
            style={{ border: `2px dashed ${drag ? '#9171BD' : 'rgba(145,113,189,0.3)'}`, borderRadius: 18, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', minHeight: 200, background: drag ? 'rgba(145,113,189,0.05)' : '#fff', transition: 'all .2s', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
            {image ? <img src={image} alt="Product" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 220 }} />
            : <>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(145,113,189,0.15), rgba(255,102,196,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📸</div>
                <p style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 1.65 }}><strong style={{ color: '#9171BD' }}>Click to upload</strong> or drag & drop</p>
              </>
            }
          </div>

          {/* Demo already used message */}
          {showUsedMsg && (
            <div style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #fff5fb, #f5f0ff)', border: '2px solid rgba(145,113,189,0.25)', borderRadius: 14, padding: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: 22, marginBottom: 6 }}>🎉</p>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 6 }}>You've used your free listing!</p>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>Get unlimited listings, 10 AI mockups per product, and all platforms for just $19 — yours forever.</p>
              <a href={import.meta.env.VITE_STRIPE_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 24px', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 15px rgba(145,113,189,0.3)' }}>
                Get Lifetime Access — $19 ✨
              </a>
            </div>
          )}

          {image && !used && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#999', marginBottom: 8 }}>Selling on</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", border: platform === p ? '2px solid #9171BD' : '1.5px solid #e0e0e0', background: platform === p ? '#9171BD' : '#fff', color: platform === p ? '#fff' : '#666', transition: 'all .15s' }}>{p}</button>
                ))}
              </div>
              <button onClick={generate} disabled={loading} style={{ width: '100%', padding: '14px 24px', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 15px rgba(145,113,189,0.35)', transition: 'all .2s' }}>
                {loading ? <><span className="spinner" />Generating...</> : <>✨ Generate My Free Listing</>}
              </button>
            </div>
          )}
        </div>

        <div>
          {!result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 12, border: '2px dashed #e8e8e8', borderRadius: 18, color: '#bbb', fontSize: 14, textAlign: 'center', padding: '2rem', background: '#fafafa' }}>
              <div style={{ fontSize: 36 }}>✨</div>
              <p style={{ color: '#aaa' }}>Your listing will appear here.<br />Upload a photo to get started.</p>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 14, border: '2px dashed #e8e8e8', borderRadius: 18, background: '#fafafa' }}>
              <span className="spinner-dark" style={{ width: 32, height: 32 }} />
              <p style={{ color: '#888', fontSize: 14 }}>Reading your product...</p>
            </div>
          )}

          {result && !result.error && (
            <div style={{ animation: 'pop 0.3s ease both' }}>
              {[['Title', result.title, null], ['Description', result.description, null]].map(([label, val]) => (
                <div key={label} style={{ background: '#fff', border: '1.5px solid #f0f0f0', borderRadius: 14, padding: '1.25rem', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: 8 }}>{label}</div>
                  <p style={{ fontSize: label === 'Title' ? 15 : 13, fontWeight: label === 'Title' ? 700 : 400, lineHeight: label === 'Title' ? 1.4 : 1.8, color: '#1a1a2e' }}>{val}</p>
                </div>
              ))}
              <div style={{ background: '#fff', border: '1.5px solid #f0f0f0', borderRadius: 14, padding: '1.25rem', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: 8 }}>Keywords</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{result.keywords?.map((k, i) => <span key={i} style={pill}>{k}</span>)}</div>
              </div>

              {/* Mockups — always show after result */}
              <div style={{ background: '#fff', border: '1.5px solid #f0f0f0', borderRadius: 14, padding: '1.25rem', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: 10 }}>
                  Sample Mockups {mockupLoading ? '— generating...' : mockups.length > 0 ? `(${mockups.length}/2)` : '— coming up...'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {mockups.map((url, i) => (
                    <div key={i} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#f5f5f5' }}>
                      <img src={url} alt={`Mockup ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                  {(mockupLoading || mockups.length < 2) && Array.from({ length: 2 - mockups.length }).map((_, i) => (
                    <div key={`sk-${i}`} style={{ borderRadius: 10, aspectRatio: '1', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="spinner-dark" />
                    </div>
                  ))}
                </div>
                {!mockupLoading && mockups.length > 0 && <p style={{ fontSize: 11, color: '#bbb', marginTop: 8, textAlign: 'center' }}>Unlock 10 mockups per product with full access</p>}
              </div>

              <div style={{ background: 'linear-gradient(135deg, #fff5fb, #f5f0ff)', border: '2px solid rgba(145,113,189,0.2)', borderRadius: 14, padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>That's your free listing ✨</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginBottom: 10 }}>Ready to unlock everything?</p>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>Unlimited listings · 10 AI mockups · All platforms · $19 once, yours forever.</p>
                <a href={import.meta.env.VITE_STRIPE_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '14px 24px', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 15px rgba(145,113,189,0.35)' }}>
                  Get Lifetime Access — $19 ✨
                </a>
              </div>
            </div>
          )}

          {result?.error && (
            <div style={{ background: '#fff5f5', border: '1.5px solid #ffcccc', borderRadius: 14, padding: '1.25rem' }}>
              <p style={{ color: '#e74c3c', fontSize: 14 }}>{result.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage({ stripeUrl }) {
  const navigate = useNavigate()
  const buyUrl = stripeUrl || STRIPE_URL

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #f0f0f0', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoIcon size={32} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 20, letterSpacing: '-.02em', color: '#1a1a2e' }}>
            Snap<span style={{ color: '#FF66C4' }}>.</span><span style={{ color: '#9171BD' }}>List</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#888', textDecoration: 'none', padding: '8px 16px', fontWeight: 600 }}>Get access — $19</a>
          <button onClick={() => navigate('/login')} style={{ padding: '9px 22px', borderRadius: 10, background: 'linear-gradient(135deg, #9171BD, #FF66C4)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(145,113,189,0.3)' }}>Log in</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" style={{ position: 'relative', padding: '5rem 2rem 4rem', overflow: 'visible', background: '#fff' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,102,196,0.1) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(145,113,189,0.1) 0%, transparent 70%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }} className="hero-grid">

          {/* Card first in DOM = shows first on mobile naturally */}
          {/* Right — Image 2 style card */}
          <div style={{ position: 'relative' }} className="hero-right">
            {/* Floating badge — hidden on mobile, shown on desktop */}
            <div className="hero-badge" style={{ position: 'absolute', top: -16, right: -16, zIndex: 2, background: 'linear-gradient(135deg, #FF66C4, #9171BD)', color: '#fff', borderRadius: 16, padding: '10px 16px', fontSize: 12, fontWeight: 700, boxShadow: '0 8px 20px rgba(255,102,196,0.4)', textAlign: 'center' }}>
              ✨ 30 seconds<br /><span style={{ fontSize: 10, opacity: 0.9 }}>start to finish</span>
            </div>

            <div style={{ background: '#fff', borderRadius: 24, padding: '1.5rem', boxShadow: '0 20px 60px rgba(145,113,189,0.15)', border: '1.5px solid rgba(145,113,189,0.1)' }}>

              {/* Mobile-only badge inside card */}
              <div className="hero-badge-mobile" style={{ display: 'none', background: 'linear-gradient(135deg, #FF66C4, #9171BD)', color: '#fff', borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: '1rem' }}>
                ✨ 30 seconds start to finish
              </div>

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #9171BD, #FF66C4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LogoIcon size={18} />
                  </div>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 15, color: '#1a1a2e' }}>Snap<span style={{ color: '#FF66C4' }}>.</span><span style={{ color: '#9171BD' }}>List</span></span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9171BD', background: 'rgba(145,113,189,0.1)', padding: '4px 12px', borderRadius: 20 }}>✨ Lifetime Access</span>
              </div>

              {/* Two column: photo + listing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Product photo */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>Your Product Photo</div>
                  <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '1', background: '#f5f0ff' }}>
                    <img src="/mockup-1.png" alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <button style={{ width: '100%', marginTop: 10, padding: '10px', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✨ Generate Listing + Mockups
                  </button>
                </div>

                {/* Generated listing */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>Generated Listing</div>
                  <div style={{ background: '#fafafa', border: '1.5px solid #f0f0f0', borderRadius: 12, padding: '10px', marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#bbb', marginBottom: 4 }}>Title</div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.4, margin: 0 }}>Heart Keychain Set · Candy Color Valentine Bag Charm</p>
                  </div>
                  <div style={{ background: '#fafafa', border: '1.5px solid #f0f0f0', borderRadius: 12, padding: '10px', marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#bbb', marginBottom: 4 }}>Description</div>
                    <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, margin: 0 }}>Adorable pastel conversation heart keychains — perfect Valentine's gift or everyday bag charm. Each piece is handcrafted with care and ships ready to gift.</p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['keychain gift', 'valentine', 'heart charm', 'cute bag tag'].map(k => (
                      <span key={k} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'rgba(145,113,189,0.1)', color: '#7c5cbf', border: '1px solid rgba(145,113,189,0.15)' }}>{k}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#FF66C4' }}>$12–$18</span>
                    <span style={{ fontSize: 9, color: '#bbb' }}>suggested price</span>
                  </div>
                </div>
              </div>

              {/* Mockups row */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>PRODUCT MOCKUPS (10/10)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {['/mockup-1.png', '/mockup-2.png', '/mockup-3.png', '/mockup-4.png'].map((src, i) => (
                    <div key={i} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#f5f0ff' }}>
                      <img src={src} alt={`Mockup ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Left — copy (second in DOM, moved to column 1 on desktop via CSS) */}
          <div className="hero-left">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid rgba(145,113,189,0.2)', borderRadius: 20, padding: '8px 18px', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(145,113,189,0.1)' }}>
              <span style={{ fontSize: 14 }}>🎨</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9171BD' }}>For makers, crafters & creative sellers</span>
            </div>

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', lineHeight: .95, letterSpacing: '-.03em', marginBottom: '1.25rem', color: '#1a1a2e' }}>
              Stop writing<br />listings.<br />
              <span style={{ background: 'linear-gradient(135deg, #9171BD, #FF66C4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Start selling.</span>
            </h1>

            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, maxWidth: 440, marginBottom: '0.75rem' }}>
              Upload one photo. Get a complete, SEO-optimized listing <em>and</em> 10 professional AI mockups — in under a minute.
            </p>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: '2rem' }}>Etsy · Shopify · TikTok Shop · Beacons · Payhip · and more</p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '2.5rem' }} className="btn-row">
              <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} style={{ padding: '15px 32px', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(145,113,189,0.35)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Try it free ↓
              </button>
              <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '15px 32px', background: '#fff', color: '#1a1a2e', border: '2px solid #e8e8e8', borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Get lifetime access — $19
              </a>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[['30 sec', 'avg time per listing'], ['$19', 'one-time forever'], ['10', 'AI mockups per product']].map(([stat, label]) => (
                <div key={stat}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(135deg, #9171BD, #FF66C4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stat}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Layout: card first in DOM for mobile, CSS swaps on desktop */}
        <style>{`
          @media(min-width:769px){
            .hero-right{ order: 2; }
            .hero-left{ order: 1; }
            .hero-badge-mobile{ display: none !important; }
          }
          @media(max-width:768px){
            .hero-grid{
              grid-template-columns: 1fr !important;
              gap: 1.5rem !important;
            }
            .hero-section{ padding: 1.5rem 1rem 2rem !important; overflow: visible !important; }
            .hero-badge{ display: none !important; }
            .hero-badge-mobile{ display: block !important; }
          }
        `}</style>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '5rem 2rem', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(145,113,189,0.1), rgba(255,102,196,0.1))', color: '#9171BD', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, marginBottom: 12 }}>Simple by design</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#1a1a2e' }}>How it works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ background: '#FAFAFA', border: '1.5px solid #f0f0f0', borderRadius: 18, padding: '1.75rem', textAlign: 'center', transition: 'transform .2s', cursor: 'default' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{step.emoji}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" style={{ padding: '5rem 1.5rem', borderTop: '1px solid #f0f0f0', background: 'linear-gradient(135deg, #fff5fb 0%, #f5f0ff 100%)' }} className="demo-section">
        <DemoSection onBuy={() => window.open(buyUrl, '_blank')} />
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '5rem 2rem', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(56,182,255,0.1), rgba(145,113,189,0.1))', color: '#38B6FF', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, marginBottom: 12 }}>From the community</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#1a1a2e' }}>Makers love it 💛</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: '#FAFAFA', border: '1.5px solid #f0f0f0', borderRadius: 18, padding: '1.5rem' }}>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: '1.25rem', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>{t.name[0]}</div>
                  <div><div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{t.name}</div><div style={{ fontSize: 12, color: '#aaa' }}>{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '5rem 2rem', borderTop: '1px solid #f0f0f0', background: 'linear-gradient(135deg, #f5f0ff 0%, #fff5fb 100%)', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, marginBottom: 16 }}>Simple pricing</span>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#1a1a2e', marginBottom: 8 }}>One price. Forever yours.</h2>
        <p style={{ fontSize: 15, color: '#888', marginBottom: '3rem' }}>No monthly fees. No usage limits. No surprises.</p>

        <div style={{ maxWidth: 440, margin: '0 auto', background: '#fff', border: '2px solid rgba(145,113,189,0.2)', borderRadius: 24, padding: '2.5rem', boxShadow: '0 8px 40px rgba(145,113,189,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: '1.5rem' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '4rem', fontWeight: 900, background: 'linear-gradient(135deg, #9171BD, #FF66C4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$19</span>
            <span style={{ fontSize: 14, color: '#aaa' }}>one-time · lifetime</span>
          </div>
          <ul style={{ listStyle: 'none', textAlign: 'left', marginBottom: '2rem' }}>
            {['Unlimited listing generations', '10 AI product mockups per upload', 'Etsy, Shopify, TikTok Shop, Beacons & more', 'Title, description, keywords & category', 'Price suggestions & occasion tags', 'Login from any device, any time', 'Yours forever — no subscription'].map(f => (
              <li key={f} style={{ fontSize: 14, color: '#444', padding: '9px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 16 }}>✅</span>{f}
              </li>
            ))}
          </ul>
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '16px 24px', background: 'linear-gradient(135deg, #9171BD, #FF66C4)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none', textAlign: 'center', boxShadow: '0 6px 20px rgba(145,113,189,0.35)' }}>
            Get Lifetime Access — $19 ✨
          </a>
          <p style={{ fontSize: 12, color: '#bbb', marginTop: 12 }}>Try it free first — no account needed ↑</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #f0f0f0', padding: '2rem', textAlign: 'center', fontSize: 13, color: '#bbb', background: '#fff' }}>
        <p>© {new Date().getFullYear()} SnapList · Built by <a href="https://danicreatesit.com" style={{ color: '#9171BD', textDecoration: 'none', fontWeight: 600 }}>Dani Creates It</a></p>
      </footer>
    </div>
  )
}
