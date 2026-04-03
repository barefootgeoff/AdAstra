import type { ReactNode } from 'react'

// Inline bold/italic parser — returns array of ReactNodes
function parseInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2] !== undefined) {
      out.push(<strong key={`${keyBase}-b${m.index}`} className="font-semibold text-zinc-100">{m[2]}</strong>)
    } else if (m[3] !== undefined) {
      out.push(<em key={`${keyBase}-i${m.index}`} className="italic text-zinc-300">{m[3]}</em>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out.length ? out : [text]
}

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  const lines = content.split('\n')
  const nodes: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      nodes.push(<hr key={i} className="border-zinc-700/60 my-2" />)
      i++; continue
    }

    // H2 heading
    if (raw.startsWith('## ')) {
      nodes.push(
        <p key={i} className="font-semibold text-zinc-100 text-sm mt-2 mb-0.5 leading-snug">
          {parseInline(raw.slice(3), String(i))}
        </p>,
      )
      i++; continue
    }

    // H3 heading
    if (raw.startsWith('### ')) {
      nodes.push(
        <p key={i} className="font-medium text-zinc-200 text-sm mt-1.5 mb-0.5 leading-snug">
          {parseInline(raw.slice(4), String(i))}
        </p>,
      )
      i++; continue
    }

    // Bullet list — collect consecutive bullet lines
    if (raw.startsWith('- ') || raw.startsWith('* ')) {
      const items: ReactNode[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        const text = lines[i].slice(2)
        items.push(
          <li key={i} className="ml-1 pl-1">
            {parseInline(text, String(i))}
          </li>,
        )
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-outside ml-3 space-y-0.5 my-1">
          {items}
        </ul>,
      )
      continue
    }

    // Empty line → spacer
    if (trimmed === '') {
      nodes.push(<div key={i} className="h-1" />)
      i++; continue
    }

    // Paragraph
    nodes.push(
      <p key={i} className="leading-relaxed">
        {parseInline(raw, String(i))}
      </p>,
    )
    i++
  }

  return <div className={`text-sm space-y-0.5 ${className}`}>{nodes}</div>
}
