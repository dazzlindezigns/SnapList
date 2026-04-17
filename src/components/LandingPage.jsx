import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const STRIPE_URL = import.meta.env.VITE_STRIPE_URL || 'https://buy.stripe.com/PLACEHOLDER'

const PLATFORMS = ['Etsy', 'Shopify', 'Own Website', 'Payhip', 'Beacons', 'TikTok Shop', 'Facebook Shop']

const HOW_IT_WORKS = [
  { num: '01', title: 'Snap your product', body: 'Take a photo of your handmade item — straight from your phone, no fancy setup needed.' },
  { num: '02', title: 'Pick your platform', body: 'Choose where you\'re selling. SnapList optimizes every word for that specific marketplace.' },
  { num: '03', title: 'Get your full listing', body: 'Title, description, keywords, category, price suggestion, and occasion tags — ready to paste.' },
  { num: '04', title: 'Generate 10 mockups', body: 'AI-generated product photos in different styles and settings. Look like a pro without a photoshoot.' },
]

const TESTIMONIALS = [
  { name: 'Jasmine T.', role: 'Etsy seller · jewelry', text: 'I used to spend 45 minutes writing each listing. Now it takes 30 seconds. This tool is everything for my shop.' },
  { name: 'Maria R.', role: '3D printing seller', text: 'The keywords it generates are actually researched-level good. My views went up within the first week.' },
  { name: 'Keisha B.', role: 'Handmade goods · Shopify', text: 'I was skeptical but the free demo convinced me instantly. Best $19 I\'ve spent on my business this year.' },
]

const BG = {
  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
  background: `
    radial-gradient(ellipse 65% 55% at 15% 5%, rgba(145,113,189,0.22) 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 88% 95%, rgba(255,102,196,0.16) 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 65% 42%, rgba(56,182,255,0.08) 0%, transparent 50%)
  `
}

const DOTS = {
  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
  maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
  WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)'
}

function LogoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="url(#lp-g)"/>
      <path d="M10 14C10 11.8 11.8 10 14 10H22C24.2 10 26 11.8 26 14C26 16.2 24.2 18 22 18H14C11.8 18 10 19.8 10 22C10 24.2 11.8 26 14 26H26"
        stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="27" cy="10" r="3" fill="#FF66C4"/>
      <defs>
        <linearGradient id="lp-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9171BD"/><stop offset="1" stopColor="#6B4FA0"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function DemoSection({ onBuy }) {
  const DEMO_COOKIE = 'snaplist_demo_used'

  const hasDemoBeenUsed = () => {
    return document.cookie.split(';').some(c => c.trim().startsWith(`${DEMO_COOKIE}=`))
  }

  const markDemoUsed = () => {
    // Expires in 30 days
    const exp = new Date()
    exp.setDate(exp.getDate() + 30)
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
  const fileRef = useRef()

  const DEMO_MOCKUP_PROMPTS = [
    'Place this product on a clean white background with soft studio lighting. Professional e-commerce product photography.',
    'Place this product in a cozy lifestyle scene on a rustic wooden table with soft natural window light and warm tones.',
  ]

  const generateMockups = async (productTitle, b64) => {
    setMockupLoading(true)
    const generated = []
    for (const prompt of DEMO_MOCKUP_PROMPTS) {
      try {
        const res = await fetch('/api/mockup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${prompt} The product is: ${productTitle}. Keep the product looking exactly as shown in the photo.`,
            imageBase64: b64,
            mimeType: 'image/jpeg'
          })
        })
        const data = await res.json()
        if (data.b64) {
          const url = `data:${data.mimeType || 'image/png'};base64,${data.b64}`
          generated.push(url)
          setMockups([...generated])
        }
      } catch { /* skip failed mockup */ }
    }
    setMockupLoading(false)
  }

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/') || used) return
    setImageFile(file)
    setImage(URL.createObjectURL(file))
    setResult(null)
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
      const data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
      res(data)
    }
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })

  const generate = async () => {
    if (!imageFile || used) return
    setLoading(true)
    try {
      const b64 = await toBase64(imageFile)
      // Call our serverless proxy instead of Anthropic directly
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
              { type: 'text', text: `Analyze this product image and generate an optimized listing for ${platform}. Respond with ONLY this JSON structure: {"title":"SEO title under 140 chars","description":"3 paragraphs about this product","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13"],"category":"product category","price_suggestion":"$XX-$XX"}` }
            ]
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      // Try multiple parsing strategies
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
      if (!parsed) throw new Error('Could not parse response — please try again')
      setResult(parsed)
      setUsed(true)
      markDemoUsed()
      // Generate 2 demo mockups after listing — pass the b64 image
      generateMockups(parsed.title || 'handmade product', b64)
    } catch (err) {
      setResult({ error: err.message || 'Something went wrong — please try again.' })
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 12 }}>Try it free — no account needed</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-.02em', marginBottom: 12 }}>
          See it work on your product
        </h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 480, margin: '0 auto' }}>
          Upload a real photo. Get a real listing. One try, on us.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <div
            style={{
              border: `1.5px dashed ${drag ? 'var(--purple)' : 'rgba(145,113,189,0.3)'}`,
              borderRadius: 18, padding: '2rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '1rem', cursor: used ? 'default' : 'pointer', minHeight: 200,
              background: drag ? 'rgba(145,113,189,0.09)' : 'rgba(145,113,189,0.04)',
              transition: 'all .2s', position: 'relative', overflow: 'hidden'
            }}
            onDragOver={e => { if (!used) { e.preventDefault(); setDrag(true) } }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => !used && fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
            {image ? (
              <img src={image} alt="Product" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 220 }} />
            ) : (
              <>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,rgba(145,113,189,0.2),rgba(255,102,196,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📸</div>
                <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--purple)' }}>Click to upload</strong> or drag & drop
                </p>
              </>
            )}
          </div>

          {/* Demo already used — only show when they try to upload again */}
          {used && !result && image && (
            <div style={{
              marginTop: '1.5rem',
              background: 'linear-gradient(135deg, rgba(145,113,189,0.15), rgba(255,102,196,0.1))',
              border: '1px solid rgba(145,113,189,0.3)',
              borderRadius: 14, padding: '1.5rem', textAlign: 'center'
            }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>You've used your free demo ✦</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Ready for unlimited access?</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Unlimited listings · 10 AI mockups per product · All platforms · $19 once, yours forever.
              </p>
              <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', width: '100%', padding: '14px 24px',
                background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                color: '#fff', border: 'none', borderRadius: 12,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center'
              }}>Get Lifetime Access — $19</a>
            </div>
          )}

          {image && !used && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Selling on</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    border: platform === p ? '1px solid var(--purple)' : '1px solid var(--border)',
                    background: platform === p ? 'var(--purple)' : 'transparent',
                    color: platform === p ? '#fff' : 'var(--muted)', transition: 'all .15s'
                  }}>{p}</button>
                ))}
              </div>
              <button onClick={generate} disabled={loading} style={{
                width: '100%', padding: '14px 24px',
                background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                color: '#fff', border: 'none', borderRadius: 12,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
                {loading ? <><span className="spinner" />Generating...</> : <>✦ Generate My Free Listing</>}
              </button>
            </div>
          )}
        </div>

        <div>
          {!result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 12, border: '1px solid var(--border)', borderRadius: 18, color: 'var(--faint)', fontSize: 14, textAlign: 'center', padding: '2rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(145,113,189,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✦</div>
              <p>Your listing will appear here.<br />Upload a photo to get started.</p>
            </div>
          )}

          {result && !result.error && (
            <div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Title</div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, lineHeight: 1.45 }}>{result.title}</p>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Description</div>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(244,240,255,0.65)' }}>{result.description}</p>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Keywords</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {result.keywords?.map((k, i) => (
                    <span key={i} style={{ fontSize: 12, fontWeight: 500, padding: '4px 11px', borderRadius: 20, background: 'rgba(145,113,189,0.15)', color: '#c4aee8', border: '1px solid rgba(145,113,189,0.25)' }}>{k}</span>
                  ))}
                </div>
              </div>
              {/* Mockups */}
              {(mockups.length > 0 || mockupLoading) && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 10 }}>
                    Sample Mockups {mockupLoading ? '— generating...' : `(${mockups.length}/2)`}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {mockups.map((url, i) => (
                      <div key={i} style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: '#1a1720' }}>
                        <img src={url} alt={`Mockup ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                    {mockupLoading && mockups.length < 2 && Array.from({ length: 2 - mockups.length }).map((_, i) => (
                      <div key={`loading-${i}`} style={{ borderRadius: 8, aspectRatio: '1', background: 'rgba(145,113,189,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="spinner" style={{ width: 20, height: 20, borderColor: 'rgba(145,113,189,0.3)', borderTopColor: 'var(--purple)' }} />
                      </div>
                    ))}
                  </div>
                  {!mockupLoading && <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8, textAlign: 'center' }}>Unlock 10 mockups per product with full access</p>}
                </div>
              )}

              <div style={{ background: 'linear-gradient(135deg, rgba(145,113,189,0.15), rgba(255,102,196,0.1))', border: '1px solid rgba(145,113,189,0.3)', borderRadius: 14, padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>That's your free listing ✦</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Ready to unlock everything?</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>Unlimited listings · 10 AI mockups · All platforms · $19 once, yours forever.</p>
                <button onClick={onBuy} style={{ width: '100%', padding: '14px 24px', background: 'linear-gradient(135deg, var(--purple), var(--pink))', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                  Get Lifetime Access — $19
                </button>
              </div>
            </div>
          )}

          {result?.error && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
              <p style={{ color: 'var(--pink)', fontSize: 14 }}>{result.error}</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 680px) { .demo-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

export default function LandingPage({ stripeUrl }) {
  const navigate = useNavigate()
  const buyUrl = stripeUrl || STRIPE_URL

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={BG} />
      <div style={DOTS} />

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: 'rgba(26,23,32,0.9)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoIcon size={32} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 20, letterSpacing: '-.02em' }}>
            <span style={{ color: '#fff' }}>Snap</span>
            <span style={{ color: '#FF66C4' }}>.</span>
            <span style={{ color: '#9171BD' }}>List</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', padding: '8px 16px' }}>Get access — $19</a>
          <button onClick={() => navigate('/login')} style={{ padding: '8px 20px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(145,113,189,0.4)', color: 'var(--purple)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Log in
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '7rem 2rem 5rem', minHeight: '90vh' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(145,113,189,0.12)', border: '1px solid rgba(145,113,189,0.25)', borderRadius: 20, padding: '6px 16px', marginBottom: '2rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--purple)' }}>For makers, crafters & creative sellers</span>
        </div>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(3.2rem, 10vw, 6.5rem)', lineHeight: .9, letterSpacing: '-.03em', marginBottom: '1.75rem' }}>
          Stop writing listings.<br />
          <span style={{ color: 'var(--pink)' }}>Start selling.</span>
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', fontWeight: 300, color: 'var(--muted)', lineHeight: 1.75, maxWidth: 560, marginBottom: '1rem' }}>
          Upload a photo of your handmade product. Get a complete, SEO-optimized listing — title, description, keywords, category — ready to paste in seconds.
        </p>
        <p style={{ fontSize: 14, color: 'var(--faint)', marginBottom: '2.5rem' }}>
          Works for Etsy · Shopify · TikTok Shop · Beacons · Payhip · and more
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: '3rem' }}>
          <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} style={{ padding: '16px 36px', background: 'linear-gradient(135deg, var(--purple), var(--pink))', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
            Try it free — no signup ↓
          </button>
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '16px 36px', background: 'transparent', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
            Get lifetime access — $19
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['30 sec', 'avg time per listing'], ['$19', 'one-time, no subscription'], ['10', 'AI mockups per product']].map(([stat, label]) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--purple), var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stat}</div>
              <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: 'relative', zIndex: 1, padding: '5rem 2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 12 }}>Simple by design</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)' }}>How it works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {HOW_IT_WORKS.map(step => (
              <div key={step.num} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--purple), var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 12 }}>{step.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', borderTop: '1px solid var(--border)' }}>
        <DemoSection onBuy={() => window.open(buyUrl, '_blank')} />
      </section>

      {/* TESTIMONIALS */}
      <section style={{ position: 'relative', zIndex: 1, padding: '5rem 2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 12 }}>From the community</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Makers love it</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                <p style={{ fontSize: 14, color: 'rgba(244,240,255,0.75)', lineHeight: 1.75, marginBottom: '1.25rem', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--purple), var(--pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--faint)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', marginTop: '1.5rem' }}>* Testimonials are placeholders — replace with real customer quotes once you have them</p>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ position: 'relative', zIndex: 1, padding: '5rem 2rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 12 }}>Simple pricing</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem' }}>One price. Forever yours.</h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: '3rem' }}>No monthly fees. No usage limits. No surprises.</p>

        <div style={{ maxWidth: 440, margin: '0 auto', background: 'rgba(145,113,189,0.08)', border: '1px solid rgba(145,113,189,0.25)', borderRadius: 20, padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: '1.5rem' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '4rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--purple), var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$19</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>one-time · lifetime</span>
          </div>
          <ul style={{ listStyle: 'none', textAlign: 'left', marginBottom: '2rem' }}>
            {['Unlimited listing generations', '10 AI product mockups per upload', 'Etsy, Shopify, TikTok Shop, Beacons & more', 'Title, description, keywords & category', 'Price suggestions & occasion tags', 'Login from any device, any time', 'Yours forever — no subscription'].map(f => (
              <li key={f} style={{ fontSize: 14, color: 'rgba(244,240,255,0.75)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, var(--purple), var(--pink))', flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '15px 24px', background: 'linear-gradient(135deg, var(--purple), var(--pink))', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
            Get Lifetime Access — $19
          </a>
          <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12 }}>Try it free first — no account needed ↑</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '2rem', textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>
        <p>© {new Date().getFullYear()} SnapList · Built by <a href="https://danicreatesit.com" style={{ color: 'var(--purple)', textDecoration: 'none' }}>Dani Creates It</a></p>
      </footer>
    </div>
  )
}
