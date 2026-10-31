export interface SkeletonProps {
  readonly className?: string
  readonly circle?: boolean
  readonly style?: React.CSSProperties
}

/** Atomic pulse skeleton placeholder aligned with SOT surface and radius tokens. UI only. */
export function Skeleton({ className = "", circle = false, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`animate-pulse bg-input-surface ${
        circle ? "rounded-full" : "rounded-md"
      } ${className}`}
    />
  )
}
