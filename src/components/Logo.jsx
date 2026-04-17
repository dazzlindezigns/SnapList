export function LogoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#logo-grad)"/>
      <path d="M10 14C10 11.8 11.8 10 14 10H22C24.2 10 26 11.8 26 14C26 16.2 24.2 18 22 18H14C11.8 18 10 19.8 10 22C10 24.2 11.8 26 14 26H26"
        stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="27" cy="10" r="3" fill="#FF66C4"/>
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9171BD"/>
          <stop offset="1" stopColor="#6B4FA0"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export function Logo({ size = 36, fontSize = 22 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LogoIcon size={size} />
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontWeight: 900, fontSize,
        letterSpacing: '-0.02em', lineHeight: 1
      }}>
        <span style={{ color: '#FFFFFF' }}>Snap</span>
        <span style={{ color: '#FF66C4' }}>.</span>
        <span style={{ color: '#9171BD' }}>List</span>
      </span>
    </div>
  )
}
