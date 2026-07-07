import { useState, type CSSProperties, type ReactNode } from 'react'

type AssetImageProps = {
  src?: string
  alt?: string
  className?: string
  style?: CSSProperties
  fallback?: ReactNode
  decorative?: boolean
}

export function AssetImage({ src, alt = '', className, style, fallback, decorative = false }: AssetImageProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return fallback ? <>{fallback}</> : <span className={className} style={style} aria-hidden="true" />
  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function SceneBackdrop({ src }: { src?: string }) {
  const style = src ? ({ '--scene-bg': `url("${src}")` } as CSSProperties) : undefined
  return <div className="scene-backdrop" style={style} aria-hidden="true" />
}

export function CssPaper({ className = '' }: { className?: string }) {
  return <span className={`css-paper-fallback ${className}`} aria-hidden="true" />
}

export function CssProp({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`css-prop-fallback ${className}`} aria-label={label}>
      {label}
    </span>
  )
}

export function ProgressFill({ value, label }: { value: number; label: string }) {
  return (
    <div className="visual-progress" aria-label={`${label}${Math.round(value)}%`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
