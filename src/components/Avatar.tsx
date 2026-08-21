export function Avatar({
  src,
  name,
  size = 40,
}: {
  src: string
  name: string
  size?: number
}) {
  const initial = (name || '?').slice(0, 1).toUpperCase()
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-full bg-line object-cover"
      style={{ width: size, height: size }}
      onError={(e) => {
        const el = e.currentTarget
        el.onerror = null
        el.src = `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#e7e5e4"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${size / 2}" fill="#57534e">${initial}</text></svg>`,
        )}`
      }}
    />
  )
}
