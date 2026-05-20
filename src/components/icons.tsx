type IconProps = { className?: string }

export function IconWechat({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8.5 3C4.91 3 2 5.46 2 8.5c0 1.72.9 3.26 2.3 4.3L3.8 15l2.55-.85c.72.2 1.48.35 2.15.35 3.59 0 6.5-2.46 6.5-5.5S12.09 3 8.5 3zm9 4C14.91 7 12 9.46 12 12.5c0 3.04 2.91 5.5 6.5 5.5.67 0 1.43-.15 2.15-.35L23.2 18l-1.5-2.2c1.4-1.04 2.3-2.58 2.3-4.3C24 9.46 21.09 7 17.5 7z" />
    </svg>
  )
}

export function IconSparkle({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M5.6 18.4l1.4-1.4m10-10 1.4-1.4" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
}

export function IconLayout({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M3 9h6" />
    </svg>
  )
}

export function IconHistory({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  )
}

export function IconFlow({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h6" />
      <circle cx="18" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="14" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSettings({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}
