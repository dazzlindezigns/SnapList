import { useState, useRef } from 'react'

const STRIPE_URL = 'https://buy.stripe.com/cNi8wO2Y69Zz3MTcbEa3u05'

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
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [platform, setPlatform] = useState('Etsy')
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [used, setUsed] = useState(false)
  const fileRef = useRef()

  const PLATFORMS = ['Etsy', 'Shopify', 'Own Website']

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (used) return
    setImageFile(file)
    setImage(URL.createObjectURL(file))
    setResult(null)
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })

  const generate = async () => {
    if (!imageFile || used) return
    setLoading(true)
    try {
      const b64 = await toBase64(imageFile)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageFile.type, data: b64 } },
              { type: 'text', text: `You are a product listing expert for handmade and craft sellers. Analyze this product image and generate a complete optimized listing for ${platform}. Return ONLY a valid JSON object, no markdown, no backticks:\n{"title":"SEO-optimized title under 140 chars","description":"3 paragraphs: emotional appeal, product details, gift angle + CTA","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13"],"category":"best category for ${platform}","price_suggestion":"$XX–$XX"}` }
            ]
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      setResult(JSON.parse(text.replace(/```json|```/g, '').trim()))
      setUsed(true)
    } catch {
      setResult({ error: 'Something went wrong — please try again.' })
    }
    setLoading(false)
  }

  const s = {
    uploadZone: {
      border: `1.5px dashed ${drag ? 'var(--purple)' : 'rgba(145,113,189,0.3)'}`,
      borderRadius: 18, padding: '2rem',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1rem', cursor: used ? 'default' : 'pointer',
      minHeight: 200, background: drag ? 'rgba(145,113,189,0.09)' : 'rgba(145,113,189,0.04)',
      transition: 'all .2s', position: 'relative', overflow: 'hidden'
    },
    outCard: {
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.25rem', marginBottom: 12
    },
    pill: {
      fontSize: 12, fontWeight: 500, padding: '4px 11px', borderRadius: 20,
      background: 'rgba(145,113,189,0.15)', color: '#c4aee8',
      border: '1px solid rgba(145,113,189,0.25)'
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '.2em',
          textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 12
        }}>Try it free — no account needed</p>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 900,
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-.02em',
          marginBottom: 12
        }}>See it work on your product</h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 480, margin: '0 auto' }}>
          Upload a real photo. Get a real listing. One try, on us.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left */}
        <div>
          <div style={s.uploadZone}
            onDragOver={e => { if (!used) { e.preventDefault(); setDrag(true) } }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => !used && fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*"
              onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
            {image ? (
              <img src={image} alt="Product" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 220 }} />
            ) : (
              <>
                <div style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: 'linear-gradient(135deg,rgba(145,113,189,0.2),rgba(255,102,196,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                }}>📸</div>
                <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--purple)' }}>Click to upload</strong> or drag & drop
                </p>
              </>
            )}
          </div>

          {image && !used && (
            <div style={{ marginTop: '1rem' }}>
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
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 10, transition: 'all .2s'
              }}>
                {loading ? <><span className="spinner" />Generating...</> : <>✦ Generate My Free Listing</>}
              </button>
            </div>
          )}
        </div>

        {/* Right */}
        <div>
          {!result && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: 280, gap: 12,
              border: '1px solid var(--border)', borderRadius: 18,
              color: 'var(--faint)', fontSize: 14, textAlign: 'center', padding: '2rem'
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(145,113,189,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
              }}>✦</div>
              <p>Your listing will appear here.<br />Upload a photo to get started.</p>
            </div>
          )}

          {result && !result.error && (
            <div>
              <div style={s.outCard}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Title</div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, lineHeight: 1.45 }}>{result.title}</p>
              </div>

              <div style={s.outCard}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Description</div>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(244,240,255,0.65)' }}>{result.description}</p>
              </div>

              <div style={s.outCard}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>Keywords</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {result.keywords?.map((k, i) => <span key={i} style={s.pill}>{k}</span>)}
                </div>
              </div>

              {/* Upsell wall */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(145,113,189,0.15), rgba(255,102,196,0.1))',
                border: '1px solid rgba(145,113,189,0.3)',
                borderRadius: 14, padding: '1.5rem', textAlign: 'center', marginTop: 4
              }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  That's your free listing ✦
                </p>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18, fontWeight: 700, marginBottom: 14
                }}>Ready to unlock everything?</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  Unlimited listings · 10 AI mockups per product · All platforms · $19 once, yours forever.
                </p>
                <button onClick={onBuy} style={{
                  width: '100%', padding: '14px 24px',
                  background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 15, fontWeight: 600, cursor: 'pointer'
                }}>Get Lifetime Access — $19</button>
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

export default function LandingPage({ onLogin, stripeUrl }) {
  const buyUrl = stripeUrl || STRIPE_URL

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={BG} />
      <div style={DOTS} />

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: 'rgba(26,23,32,0.88)', backdropFilter: 'blur(14px)',
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
        <button onClick={onLogin} style={{
          padding: '8px 20px', borderRadius: 10,
          background: 'transparent', border: '1px solid rgba(145,113,189,0.4)',
          color: 'var(--purple)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
          transition: 'all .15s'
        }}>Log in</button>
      </nav>

      {/* HERO */}
      <section style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '6rem 2rem 4rem',
        minHeight: '85vh'
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '.2em',
          textTransform: 'uppercase', color: 'var(--pink)', marginBottom: '1.5rem'
        }}>For makers · crafters · sellers</p>

        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 900,
          fontSize: 'clamp(3.2rem, 10vw, 6rem)',
          lineHeight: .92, letterSpacing: '-.03em', marginBottom: '1.5rem'
        }}>
          Snap it.<br />
          <span style={{ color: 'var(--pink)' }}>List it.</span><br />
          <span style={{ color: 'var(--purple)' }}>Sell it.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 300,
          color: 'var(--muted)', lineHeight: 1.7,
          maxWidth: 520, marginBottom: '2.5rem'
        }}>
          Upload a photo of your handmade product and get a complete, ready-to-paste listing — title, description, keywords, and category — optimized for wherever you sell.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={scrollToDemo} style={{
            padding: '15px 32px',
            background: 'linear-gradient(135deg, var(--purple), var(--pink))',
            color: '#fff', border: 'none', borderRadius: 12,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            transition: 'all .2s'
          }}>Try it free ↓</button>
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{
            padding: '15px 32px',
            background: 'transparent',
            color: 'var(--text)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
            textDecoration: 'none', transition: 'all .2s'
          }}>Get lifetime access — $19</a>
        </div>

        {/* Social proof */}
        <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          {['Etsy', 'Shopify', 'Amazon', 'Your site'].map((p, i) => (
            <span key={p} style={{
              fontSize: 12, color: 'var(--faint)',
              padding: '4px 10px', borderRadius: 20,
              border: '1px solid var(--border)'
            }}>{p}</span>
          ))}
        </div>
      </section>

      {/* DEMO SECTION */}
      <section id="demo" style={{
        position: 'relative', zIndex: 1,
        padding: '5rem 1.5rem',
        borderTop: '1px solid var(--border)'
      }}>
        <DemoSection onBuy={() => window.open(buyUrl, '_blank')} />
      </section>

      {/* PRICING */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '5rem 2rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 12 }}>Simple pricing</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '3rem' }}>
          One price. Forever yours.
        </h2>

        <div style={{
          maxWidth: 440, margin: '0 auto',
          background: 'rgba(145,113,189,0.08)',
          border: '1px solid rgba(145,113,189,0.25)',
          borderRadius: 20, padding: '2.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: '1.5rem' }}>
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: '4rem', fontWeight: 900,
              background: 'linear-gradient(135deg, var(--purple), var(--pink))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>$19</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>one-time · lifetime</span>
          </div>

          <ul style={{ listStyle: 'none', textAlign: 'left', marginBottom: '2rem' }}>
            {[
              'Unlimited listing generations',
              '10 AI product mockups per upload',
              'Works for Etsy, Shopify, Amazon & more',
              'Title, description, keywords & category',
              'Price suggestions & occasion tags',
              'Yours forever — no subscription'
            ].map(f => (
              <li key={f} style={{
                fontSize: 14, color: 'rgba(244,240,255,0.75)',
                padding: '8px 0', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, var(--purple), var(--pink))', flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>

          <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{
            display: 'block', width: '100%', padding: '15px 24px',
            background: 'linear-gradient(135deg, var(--purple), var(--pink))',
            color: '#fff', border: 'none', borderRadius: 12,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center'
          }}>Get Lifetime Access — $19</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid var(--border)',
        padding: '2rem', textAlign: 'center',
        fontSize: 13, color: 'var(--faint)'
      }}>
        <p>© {new Date().getFullYear()} SnapList · Built by <a href="https://danicreatesit.com" style={{ color: 'var(--purple)', textDecoration: 'none' }}>Dani Creates It</a></p>
      </footer>
    </div>
  )
}
