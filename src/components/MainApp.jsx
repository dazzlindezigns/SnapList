import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

const PLATFORMS = ['Etsy', 'Shopify', 'Amazon Handmade', 'Own Website', 'Payhip', 'Beacons', 'TikTok Shop', 'Facebook Shop']

const DEFAULT_SCENES = [
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

const ETHNICITIES = [
  { value: 'none', label: 'No models' },
  { value: 'Black', label: 'Black' },
  { value: 'African American', label: 'African American' },
  { value: 'Latina', label: 'Latina/Latino' },
  { value: 'Asian', label: 'Asian' },
  { value: 'South Asian', label: 'South Asian' },
  { value: 'Middle Eastern', label: 'Middle Eastern' },
  { value: 'White', label: 'White' },
  { value: 'Mixed race', label: 'Mixed' },
]

const MODEL_TYPES = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'girl', label: 'Girl' },
  { value: 'boy', label: 'Boy' },
  { value: 'person', label: 'Any' },
]

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

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
  const [productDesc, setProductDesc] = useState('')
  const [skinTone, setSkinTone] = useState('none')
  const [modelType, setModelType] = useState('woman')

  // History
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false) // mobile drawer
  const [currentListingId, setCurrentListingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const fileRef = useRef()
  const resultRef = useRef()

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setHistoryLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('listings')
      .select('id, title, platform, created_at, mockups')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setHistory(data)
    setHistoryLoading(false)
  }

  const saveListing = async (listingData, mockupData) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('listings')
      .insert({
        user_id: session.user.id,
        platform: listingData.platform || platform,
        title: listingData.title,
        description: listingData.description,
        keywords: listingData.keywords,
        category: listingData.category,
        price_suggestion: listingData.price_suggestion,
        occasion_tags: listingData.occasion_tags,
        mockups: mockupData || [],
      })
      .select('id, title, platform, created_at, mockups')
      .single()

    if (data) {
      setCurrentListingId(data.id)
      setHistory(prev => [data, ...prev])
    }
    if (error) console.error('Save error:', error)
    setSaving(false)
  }

  const updateListingMockups = async (id, mockupData) => {
    await supabase
      .from('listings')
      .update({ mockups: mockupData })
      .eq('id', id)
    // Update history preview
    setHistory(prev => prev.map(h => h.id === id ? { ...h, mockups: mockupData } : h))
  }

  const deleteListing = async (id) => {
    await supabase.from('listings').delete().eq('id', id)
    setHistory(prev => prev.filter(h => h.id !== id))
    if (currentListingId === id) handleReset()
  }

  const loadListing = async (id) => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single()
    if (!data) return
    setResult({
      title: data.title,
      description: data.description,
      keywords: data.keywords,
      category: data.category,
      price_suggestion: data.price_suggestion,
      occasion_tags: data.occasion_tags,
    })
    setMockups((data.mockups || []).map(url => ({ url, label: '' })))
    setCurrentListingId(id)
    setImage(null)
    setImageFile(null)
    setShowHistory(false)
    // Scroll to result on mobile
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleReset = () => {
    setImage(null); setImageFile(null); setResult(null)
    setMockups([]); setMockupProgress(0); setCopied({})
    setProductDesc(''); setSkinTone('none'); setModelType('woman')
    setListingLoading(false); setMockupLoading(false)
    setCurrentListingId(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file); setImage(URL.createObjectURL(file))
    setResult(null); setMockups([]); setCurrentListingId(null)
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 800; let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      res(canvas.toDataURL('image/jpeg', 0.75).split(',')[1])
    }
    img.onerror = rej; img.src = URL.createObjectURL(file)
  })

  const generateListing = async () => {
    if (!imageFile) return
    setListingLoading(true); setResult(null)
    try {
      const b64 = await toBase64(imageFile)
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'You are a product listing expert. You ONLY respond with valid JSON. No markdown, no backticks, no explanation.',
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
            { type: 'text', text: `Analyze this product image and generate an optimized listing for ${platform}.${productDesc ? ` Additional context: ${productDesc}.` : ''} Respond with ONLY this JSON: {"title":"SEO title under 140 chars","description":"3 paragraphs","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13"],"category":"category","price_suggestion":"$XX-$XX","occasion_tags":["tag1","tag2","tag3","tag4","tag5"]}` }
          ]}]
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      let parsed = null
      try { parsed = JSON.parse(text) } catch {}
      if (!parsed) { const clean = text.replace(/```json|```/g, '').trim(); try { parsed = JSON.parse(clean) } catch {} }
      if (!parsed) { const match = text.match(/\{[\s\S]*\}/); if (match) try { parsed = JSON.parse(match[0]) } catch {} }
      if (!parsed) throw new Error('Could not parse response')
      setResult(parsed)
      // Save listing immediately (mockups added later)
      await saveListing({ ...parsed, platform }, [])
      // Scroll to result on mobile
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    } catch (err) {
      setResult({ error: err.message || 'Something went wrong — please try again.' })
    }
    setListingLoading(false)
  }

  const generateMockups = async (reset = true) => {
    if (!imageFile) return
    setMockupLoading(true)
    if (reset) setMockups([])
    setMockupProgress(0)
    const b64 = await toBase64(imageFile)
    const newMockups = []
    const BATCH_SIZE = 3
    const shuffled = [...DEFAULT_SCENES].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
      const batch = shuffled.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(async (promptText) => {
        const skinInstruction = skinTone !== 'none' ? ` Include a ${skinTone} ${modelType} naturally interacting with the product.` : ''
        const descInstruction = productDesc ? ` Product context: ${productDesc}.` : ''
        const prompt = `Take this product and place it naturally into the following scene: ${promptText}.${descInstruction}${skinInstruction} Keep the product looking exactly as it does in the photo. Professional product photography, high quality, realistic lighting.`
        const res = await fetch('/api/mockup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, imageBase64: b64, mimeType: 'image/jpeg' })
        })
        const data = await res.json()
        if (data.b64) return { url: `data:${data.mimeType || 'image/png'};base64,${data.b64}`, label: promptText.split(',')[0] }
        return null
      }))
      results.forEach(r => { if (r.status === 'fulfilled' && r.value) newMockups.push(r.value) })
      setMockups([...newMockups])
      setMockupProgress(Math.min(i + BATCH_SIZE, shuffled.length))
    }
    // Save mockups to DB
    if (currentListingId && newMockups.length > 0) {
      await updateListingMockups(currentListingId, newMockups.map(m => m.url))
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
      padding: '0.85rem 1.25rem', borderBottom: '1px solid #f0f0f0',
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 2px 20px rgba(0,0,0,0.05)'
    },
    secLabel: {
      fontSize: 10, fontWeight: 700, letterSpacing: '.18em',
      textTransform: 'uppercase', color: '#bbb', marginBottom: 12
    },
    outCard: {
      background: '#fff', border: '1.5px solid #f0f0f0', borderRadius: 14,
      padding: '1.25rem', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
    },
    outHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    outLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#bbb' },
    copyBtn: { fontSize: 12, color: '#9171BD', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, padding: 0 },
    pill: (type) => ({
      fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
      ...(type === 'purple' ? { background: 'rgba(145,113,189,0.1)', color: '#7c5cbf', border: '1.5px solid rgba(145,113,189,0.2)' }
        : { background: 'rgba(255,102,196,0.1)', color: '#cc44a0', border: '1.5px solid rgba(255,102,196,0.2)' })
    }),
    empty: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 240, gap: 14, border: '2px dashed #e8e8e8', borderRadius: 18,
      color: '#ccc', fontSize: 14, textAlign: 'center', padding: '2rem', background: '#fafafa'
    },
    mockupGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 },
    mockupCard: { borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#f5f5f5', border: '1.5px solid #f0f0f0', position: 'relative' }
  }

  // History item component
  const HistoryItem = ({ item }) => (
    <div
      onClick={() => loadListing(item.id)}
      style={{
        display: 'flex', gap: 10, padding: '10px 12px',
        borderRadius: 12, cursor: 'pointer', transition: 'background .15s',
        background: currentListingId === item.id ? 'rgba(145,113,189,0.08)' : 'transparent',
        border: currentListingId === item.id ? '1.5px solid rgba(145,113,189,0.2)' : '1.5px solid transparent',
        alignItems: 'center', position: 'relative'
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f0ecfa', flexShrink: 0 }}>
        {item.mockups?.[0]
          ? <img src={item.mockups[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✨</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title || 'Untitled listing'}
        </p>
        <p style={{ fontSize: 11, color: '#bbb' }}>{item.platform} · {timeAgo(item.created_at)}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); deleteListing(item.id) }}
        style={{ background: 'none', border: 'none', color: '#ddd', cursor: 'pointer', fontSize: 14, padding: '4px', flexShrink: 0 }}
        title="Delete"
      >✕</button>
    </div>
  )

  const HistoryPanel = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={s.secLabel}>My Listings ({history.length})</p>
        {history.length > 0 && (
          <button onClick={handleReset} style={{ fontSize: 11, color: '#9171BD', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            + New
          </button>
        )}
      </div>
      {historyLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#bbb', fontSize: 13 }}>Loading...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#bbb', fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          Your listings will appear here after you generate them.
        </div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1, marginRight: -8, paddingRight: 8 }}>
          {history.map(item => <HistoryItem key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

      {/* TOPBAR */}
      <div style={s.topbar}>
        <Logo size={28} fontSize={18} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mobile history button */}
          <button
            className="history-btn-mobile"
            onClick={() => setShowHistory(true)}
            style={{
              display: 'none', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10,
              background: history.length > 0 ? 'rgba(145,113,189,0.1)' : '#f5f5f5',
              border: '1.5px solid rgba(145,113,189,0.2)',
              color: '#9171BD', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            📋 {history.length > 0 ? `${history.length} listings` : 'History'}
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9171BD', border: '1.5px solid rgba(145,113,189,0.2)', padding: '5px 12px', borderRadius: 20, display: 'none' }} className="access-badge">✨ Lifetime</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9171BD', border: '1.5px solid rgba(145,113,189,0.2)', padding: '5px 12px', borderRadius: 20 }} className="access-badge-desktop">✨ Lifetime Access</span>
          <button
            style={{ fontSize: 13, color: '#888', background: 'none', border: '1.5px solid #e8e8e8', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}
            onClick={async () => { await supabase.auth.signOut(); navigate('/') }}
          >Sign out</button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="app-layout" style={{ display: 'grid', gridTemplateColumns: '240px 1fr 1fr', gap: '1.5rem', maxWidth: 1300, margin: '0 auto', padding: '1.5rem', minHeight: 'calc(100vh - 60px)' }}>

        {/* HISTORY SIDEBAR — desktop */}
        <div className="history-sidebar" style={{ background: '#fff', borderRadius: 18, padding: '1.25rem', border: '1.5px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', height: 'fit-content', position: 'sticky', top: 80 }}>
          <HistoryPanel />
        </div>

        {/* LEFT PANEL — upload + controls */}
        <div>
          <p style={s.secLabel}>Your Product Photo</p>
          <div
            style={{
              border: `2px dashed ${drag ? '#9171BD' : 'rgba(145,113,189,0.25)'}`,
              borderRadius: 18, padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '1rem', cursor: 'pointer', minHeight: 180,
              background: drag ? 'rgba(145,113,189,0.05)' : '#fff',
              transition: 'all .2s', boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
            {image
              ? <img src={image} alt="Product" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 220 }} />
              : <>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,rgba(145,113,189,0.12),rgba(255,102,196,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📸</div>
                  <p style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 1.65 }}>
                    <strong style={{ color: '#9171BD' }}>Tap to upload</strong> or drag & drop<br />
                    <span style={{ fontSize: 12, color: '#bbb' }}>JPG, PNG, WEBP</span>
                  </p>
                </>
            }
          </div>

          {image && (
            <div style={{ marginTop: '1.25rem' }}>
              {/* Product description */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={s.secLabel}>What is this product? <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
                <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)}
                  placeholder="e.g. baby shower gift basket, pink strawberry theme..."
                  rows={2}
                  style={{ width: '100%', background: '#fff', border: '1.5px solid rgba(145,113,189,0.2)', borderRadius: 10, padding: '10px 14px', color: '#1a1a2e', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, outline: 'none', resize: 'none' }}
                />
              </div>

              {/* Model selector */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={s.secLabel}>Model in mockups? <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={skinTone} onChange={e => setSkinTone(e.target.value)}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(145,113,189,0.2)', background: '#fff', color: '#1a1a2e', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, outline: 'none' }}>
                    {ETHNICITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                  {skinTone !== 'none' && (
                    <select value={modelType} onChange={e => setModelType(e.target.value)}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(145,113,189,0.2)', background: '#fff', color: '#1a1a2e', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, outline: 'none' }}>
                      {MODEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Platform */}
              <p style={s.secLabel}>Selling On</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    border: platform === p ? '2px solid #9171BD' : '1.5px solid #e8e8e8',
                    background: platform === p ? '#9171BD' : '#fff',
                    color: platform === p ? '#fff' : '#888', transition: 'all .15s'
                  }}>{p}</button>
                ))}
              </div>

              <button
                onClick={async () => { await generateListing(); generateMockups() }}
                disabled={listingLoading || mockupLoading}
                style={{
                  width: '100%', padding: '14px 24px',
                  background: 'linear-gradient(135deg, #9171BD, #FF66C4)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 15, fontWeight: 700,
                  cursor: (listingLoading || mockupLoading) ? 'not-allowed' : 'pointer',
                  opacity: (listingLoading || mockupLoading) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 6px 20px rgba(145,113,189,0.35)'
                }}
              >
                {listingLoading ? <><span className="spinner" />Generating listing...</>
                  : mockupLoading ? <><span className="spinner" />Mockups ({mockupProgress}/10)...</>
                  : <>✨ Generate Listing + Mockups</>}
              </button>

              {saving && <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 6 }}>Saving...</p>}

              <button onClick={handleReset} style={{
                width: '100%', marginTop: 8, padding: '10px',
                background: 'transparent', border: '1.5px solid #e8e8e8',
                borderRadius: 12, color: '#999', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>🔄 Start a new listing</button>
            </div>
          )}

          {/* Mockups */}
          {(mockups.length > 0 || mockupLoading) && (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={s.secLabel}>Product Mockups ({mockups.length}/10){mockupLoading ? ' — generating...' : ''}</p>
              <div style={s.mockupGrid}>
                {mockups.map((m, i) => (
                  <div key={i} style={s.mockupCard}>
                    <img src={m.url} alt={m.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 7px', borderRadius: 4 }}>{m.label}</div>
                    <a href={m.url} download={`mockup-${i+1}.png`} target="_blank" rel="noopener noreferrer"
                      style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, background: 'rgba(145,113,189,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>↓</a>
                  </div>
                ))}
                {mockupLoading && Array.from({ length: Math.min(3, 10 - mockups.length) }).map((_, i) => (
                  <div key={`sk-${i}`} style={{ ...s.mockupCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="spinner-dark" />
                  </div>
                ))}
              </div>
              {!mockupLoading && mockups.length > 0 && (
                <button onClick={() => { setMockups([]); generateMockups(true) }} style={{
                  width: '100%', marginTop: 10, padding: '10px',
                  background: 'rgba(145,113,189,0.07)', border: '1.5px solid rgba(145,113,189,0.2)',
                  borderRadius: 12, color: '#9171BD', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: 'pointer'
                }}>🖼️ Generate 10 more mockups</button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL — listing output */}
        <div ref={resultRef}>
          <p style={s.secLabel}>Generated Listing</p>

          {!result && !listingLoading && (
            <div style={s.empty}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>✨</div>
              <p style={{ color: '#aaa', lineHeight: 1.6 }}>Upload a photo and tap Generate<br />to build your listing instantly.</p>
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
              <p style={{ color: '#FF66C4', fontSize: 14 }}>{result.error}</p>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE HISTORY DRAWER */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowHistory(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: '1.25rem', maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0', margin: '0 auto 1rem' }} />
            <HistoryPanel />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
        .spinner-dark { width:22px; height:22px; border:2px solid rgba(145,113,189,0.2); border-top-color:#9171BD; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }

        @media(max-width:900px){
          .app-layout{ grid-template-columns: 1fr 1fr !important; }
          .history-sidebar{ display: none !important; }
          .history-btn-mobile{ display: flex !important; }
          .access-badge-desktop{ display: none !important; }
          .access-badge{ display: block !important; }
        }

        @media(max-width:620px){
          .app-layout{ grid-template-columns: 1fr !important; padding: 1rem !important; gap: 1rem !important; }
        }
      `}</style>
    </div>
  )
}
