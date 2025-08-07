import React, { useCallback, useState } from 'react'
import 'katex/dist/katex.min.css'
import ParadigmChatIcon from '../../assets/ParadigmChatIcon.png'

const renderLatex = (text: string) => {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/)

  return parts.map((part, index) => {
    if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('\\[') && part.endsWith('\\]'))) {
      const latex = part.slice(2, -2)
      try {
        const katex = (window as any).katex
        if (katex) {
          return <div key={index} className="my-2 text-center" dangerouslySetInnerHTML={{ __html: katex.renderToString(latex, { displayMode: true }) }} />
        }
      } catch (e) {
        return <span key={index} className="text-red-400">[Math Error: {latex}]</span>
      }
    } else if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\(') && part.endsWith('\\)'))) {
      const latex = part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2)
      try {
        const katex = (window as any).katex
        if (katex) {
          return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(latex, { displayMode: false }) }} />
        }
      } catch (e) {
        return <span key={index} className="text-red-400">[Math Error: {latex}]</span>
      }
    }
    return formatText(part, index)
  })
}

const formatText = (text: string, key: number) => {
  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/)
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).trim()
        const lines = code.split('\n')
        const language = lines[0].includes(' ') ? '' : lines[0]
        const codeContent = language ? lines.slice(1).join('\n') : code
        return (
          <div key={`${key}-${i}`} className="my-2 bg-black/40 rounded-lg p-3 border border-white/10">
            {language && <div className="text-[10px] text-white/60 mb-2 font-mono">{language}</div>}
            <pre className="text-[11px] text-green-300 font-mono whitespace-pre-wrap overflow-x-auto">{codeContent}</pre>
          </div>
        )
      }
      return formatParagraphsAndLists(part, `${key}-${i}`)
    })
  }
  return formatParagraphsAndLists(text, key)
}

const formatParagraphsAndLists = (text: string, key: number | string) => {
  const lines = text.split('\n')
  const result: JSX.Element[] = []
  let currentParagraph: string[] = []

  const flushParagraph = (pIndex: number) => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(' ').trim()
      if (paragraphText) {
        result.push(<div key={`${key}-para-${pIndex}`} className="mb-3">{formatInlineElements(paragraphText, `${key}-para-${pIndex}`)}</div>)
      }
      currentParagraph = []
    }
  }

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return flushParagraph(lineIndex)
    if (trimmedLine.match(/^(\d+)\.\s+(.+)$/)) return flushParagraph(lineIndex), result.push(<div key={`${key}-numbered-${lineIndex}`} className="mb-2">{formatInlineElements(trimmedLine, `${key}-numbered-${lineIndex}`)}</div>)
    if (trimmedLine.match(/^[-*\u2022]\s+(.+)$/)) return flushParagraph(lineIndex), result.push(<div key={`${key}-bullet-${lineIndex}`} className="mb-2">{formatInlineElements(trimmedLine, `${key}-bullet-${lineIndex}`)}</div>)
    currentParagraph.push(trimmedLine)
  })

  flushParagraph(lines.length)

  return result.length > 0 ? result : [<div key={`${key}-fallback`}>{formatInlineElements(text, `${key}-fallback`)}</div>]
}

const formatInlineElements = (text: string, key: number | string) => {
  const codeRegex = /`([^`]+)`/g
  const parts = text.split(codeRegex)

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <code key={`${key}-code-${i}`} className="bg-black/40 px-1.5 py-0.5 rounded text-[11px] font-mono text-cyan-300">{part}</code>
    }
    const boldRegex = /\*\*(.*?)\*\*/g
    const boldParts = part.split(boldRegex)
    return boldParts.map((boldPart, j) => {
      if (j % 2 === 1) {
        return <strong key={`${key}-bold-${i}-${j}`} className="font-semibold text-white">{boldPart}</strong>
      }
      const italicRegex = /\*(.*?)\*/g
      const italicParts = boldPart.split(italicRegex)
      return italicParts.map((italicPart, k) => {
        if (k % 2 === 1) {
          return <em key={`${key}-italic-${i}-${j}-${k}`} className="italic text-white/90">{italicPart}</em>
        }
        return <span key={`${key}-text-${i}-${j}-${k}`}>{italicPart}</span>
      })
    })
  })
}

export default renderLatex
