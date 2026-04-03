import React from 'react'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  messageType?: string | null
}

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

const SPECIALIST_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  cardiologist: { icon: '❤️', label: 'Cardiologist', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  dentist:      { icon: '🦷', label: 'Dentist',       bg: 'bg-sky-50',  text: 'text-sky-700',  border: 'border-sky-200'  },
  general:      { icon: '🩺', label: 'General Health', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const specialist = message.messageType ? SPECIALIST_CONFIG[message.messageType] ?? SPECIALIST_CONFIG.general : null
  const avatarIcon = specialist?.icon ?? '🩺'
  const showTypingDots = isStreaming && message.content === ''

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

      {/* Bubble */}
      <div className={`max-w-xl ${
        isUser
          ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm'
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && message.content !== '' && (
              <span className="inline-block w-0.5 h-4 bg-slate-500 ml-0.5 align-middle animate-pulse" />
            )}
          </p>

          {/* Typing dots — shown before first token */}
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
  )
}
