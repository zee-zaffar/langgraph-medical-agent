'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import { streamChatWithAgent } from '@/lib/api'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  messageType?: string | null
}

const SPECIALIST_ICONS: Record<string, string> = {
  cardiologist: '❤️',
  dentist: '🦷',
  general: '🩺',
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: 'Hello! I\'m your AI medical assistant. I can route your query to the right specialist — Cardiologist, Dentist, or General Health. How can I help you today?',
      role: 'assistant',
    }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
    }

    const assistantId = (Date.now() + 1).toString()

    setMessages(prev => [
      ...prev,
      userMessage,
      { id: assistantId, content: '', role: 'assistant', messageType: null },
    ])
    setLoading(true)
    setError(null)

    await streamChatWithAgent(content, {
      onMessageType: (type) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, messageType: type } : m)
        )
      },
      onToken: (token) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)
        )
      },
      onDone: () => {
        setLoading(false)
      },
      onError: (err) => {
        console.error('Stream error:', err)
        setError('Could not reach the medical agent. Please ensure the backend is running.')
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        setLoading(false)
      },
    })
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">M</div>
          <div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">MedAI Assistant</p>
            <p className="text-xs text-slate-400">LangGraph Powered</p>
          </div>
        </div>
        {/* Capabilities */}
        <div className="px-4 pt-5 pb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-3">Specialists</p>
          {Object.entries(SPECIALIST_ICONS).map(([key, icon]) => (
            <div key={key} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-base">{icon}</span>
              <span className="text-sm text-slate-600 capitalize">{key}</span>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="mt-auto px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">⚠️ For informational use only. Not a substitute for professional medical advice.</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm">
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800">Medical Consultation</h1>
            <p className="text-xs text-slate-400">Ask a health question — AI will route to the right specialist</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-slate-500 font-medium">Agent Online</span>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-red-500 mt-0.5">⚠</span>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message, i) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={loading && i === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={loading}
        />
      </div>
    </div>
  )
}
