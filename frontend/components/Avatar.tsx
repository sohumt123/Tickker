"use client"


export default function Avatar({
  name,
  size = 32,
}: {
  name: string
  size?: number
}) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(12, Math.floor(size / 2.8)),
  }

  return (
    <div
      className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white"
      style={style}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  )
}


