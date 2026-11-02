export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape < to prevent </script> injection from user-controlled strings (e.g. coach name/bio)
  const safe = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
