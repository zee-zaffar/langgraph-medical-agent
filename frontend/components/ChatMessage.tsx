import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  messageType?: string | null
  isEmergency?: boolean
}

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

const SPECIALIST_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  cardiologist: { icon: '❤️', label: 'Cardiologist',   bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200'    },
  dentist:      { icon: '🦷', label: 'Dentist',         bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200'     },
  nutritionist: { icon: '🥦', label: 'Nutritionist',    bg: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200'    },
  general:      { icon: '🩺', label: 'General Health',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}

const EMERGENCY_PATTERNS = [
  /heart attack/i, /chest crushing/i, /can'?t breathe/i, /cannot breathe/i,
  /stroke/i, /loss of consciousness/i, /passed out/i,
  /severe chest pain/i, /choking/i, /not breathing/i, /collapsed/i,
  /difficulty breathing/i, /trouble breathing/i,
]

function isEmergency(text: string) {
  return EMERGENCY_PATTERNS.some(p => p.test(text))
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const specialist = message.messageType ? SPECIALIST_CONFIG[message.messageType] ?? SPECIALIST_CONFIG.general : null
  const avatarIcon = specialist?.icon ?? '🩺'
  const showTypingDots = isStreaming && message.content === ''
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const emergency = !isUser && (message.isEmergency || isEmergency(message.content))

  return (
    <div className={`flex items-start gap-3 message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm shrink-0 shadow-sm">
          {avatarIcon}
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
          You
        </div>
      )}

      <div className="flex flex-col gap-2 max-w-xl min-w-0">
        {/* Emergency banner */}
        {emergency && (
          <div className="flex items-center gap-2 bg-red-600 text-white rounded-xl px-4 py-2.5 shadow-md animate-pulse">
            <span className="text-lg">🚨</span>
            <span className="text-sm font-semibold">This sounds like a medical emergency — call 999 / 911 immediately</span>
          </div>
        )}

        {/* Bubble */}
        <div className={`group relative ${
          isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm'
        }`}>

          {/* Copy button — assistant messages only, shown on hover */}
          {!isUser && message.content && !isStreaming && (
            <button
              onClick={handleCopy}
              title="Copy response"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              {copied
                ? <span className="text-xs text-emerald-600 font-medium">✓ Copied</span>
                : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              }
            </button>
          )}

          {/* Content */}
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm prose-slate max-w-none
              prose-headings:font-semibold prose-headings:text-slate-800 prose-headings:mt-3 prose-headings:mb-1
              prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-strong:text-slate-900 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && message.content !== '' && (
                <span className="inline-block w-0.5 h-4 bg-slate-500 ml-0.5 align-middle animate-pulse" />
              )}
            </div>
          )}

          {/* Typing dots */}
          {showTypingDots && (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200"></span>
            </div>
          )}

          {/* Specialist badge */}
          {!isUser && specialist && (
            <div className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border ${specialist.bg} ${specialist.text} ${specialist.border}`}>
              <span>{specialist.icon}</span>
              <span>{specialist.label} Agent</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

