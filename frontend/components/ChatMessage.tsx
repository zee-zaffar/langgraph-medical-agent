import React from 'react'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  messageType?: string | null
}

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const getAgentBadge = (messageType?: string | null) => {
    if (!messageType) return null

    const badges: Record<string, { bg: string; text: string }> = {
      cardiologist: { bg: 'bg-red-100', text: 'text-red-700' },
      dentist: { bg: 'bg-blue-100', text: 'text-blue-700' },
      general: { bg: 'bg-green-100', text: 'text-green-700' },
    }

    const badge = badges[messageType] || badges.general

    return (
      <span className={`inline-block ${badge.bg} ${badge.text} text-xs px-2 py-1 rounded-full mt-2`}>
        {messageType.charAt(0).toUpperCase() + messageType.slice(1)} Agent
      </span>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        {!isUser && message.messageType && getAgentBadge(message.messageType)}
      </div>
    </div>
  )
}
