'use client'

interface MarkdownTextProps {
  children: string
  className?: string
}

export default function MarkdownText({ children, className = '' }: MarkdownTextProps) {
  // Convert markdown-like formatting to HTML
  const formatText = (text: string) => {
    // Split by backticks to find code blocks
    const parts = text.split(/(`[^`]+`)/)
    
    return parts.map((part, index) => {
      // Check if this part is wrapped in backticks
      if (part.startsWith('`') && part.endsWith('`')) {
        // Remove backticks and wrap in code element
        const codeContent = part.slice(1, -1)
        return (
          <code
            key={index}
            className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-blue-600 dark:text-blue-400 whitespace-pre"
          >
            {codeContent}
          </code>
        )
      }
      // Handle plain text with newlines
      if (part.includes('\n')) {
        const lines = part.split('\n')
        return lines.map((line, lineIdx) => (
          <span key={`${index}-${lineIdx}`}>
            {line}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        ))
      }
      return <span key={index}>{part}</span>
    })
  }

  return <span className={className}>{formatText(children)}</span>
}

