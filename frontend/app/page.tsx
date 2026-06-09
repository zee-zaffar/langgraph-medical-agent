'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import { streamChatWithAgent } from '@/lib/api'

const EMERGENCY_PATTERNS = [
  /heart attack/i, /chest crushing/i, /can'?t breathe/i, /cannot breathe/i,
  /stroke/i, /loss of consciousness/i, /passed out/i,
  /severe chest pain/i, /choking/i, /not breathing/i, /collapsed/i,
  /difficulty breathing/i, /trouble breathing/i,
]

function detectEmergency(text: string) {
  return EMERGENCY_PATTERNS.some(p => p.test(text))
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  messageType?: string | null
  isEmergency?: boolean
}

const SPECIALIST_CONFIG: Record<string, { icon: string; description: string; color: string }> = {
  cardiologist: { icon: '❤️', description: 'Heart & cardiovascular', color: 'text-rose-600' },
  dentist:      { icon: '🦷', description: 'Teeth & oral health',    color: 'text-sky-600'  },
  nutritionist: { icon: '🥦', description: 'Diet & nutrition',       color: 'text-lime-600' },
  general:      { icon: '🩺', description: 'General health',         color: 'text-emerald-600' },
}

const DEMO_PROMPTS: { label: string; text: string; specialist: string }[] = [
  { label: 'Chest pain', text: 'I have been having sharp chest pain and my heart feels like it is racing. What could this be?', specialist: 'cardiologist' },
  { label: 'Sensitive teeth', text: 'My teeth are really sensitive to cold drinks and I notice some bleeding when I brush. Should I be worried?', specialist: 'dentist' },
  { label: 'Low energy diet', text: 'I feel tired all the time. Could my diet be causing low energy? What foods should I eat more of?', specialist: 'nutritionist' },
  { label: 'Persistent cough', text: 'I have had a persistent cough for 3 weeks with a mild fever. What should I do?', specialist: 'general' },
]

const WELCOME_MESSAGE = "Hello! I'm your AI medical assistant powered by LangGraph. I automatically route your question to the right specialist — Cardiologist ❤️, Dentist 🦷, Nutritionist 🥦, or General Health 🩺. How can I help you today?"

export default function Home() {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', content: WELCOME_MESSAGE, role: 'assistant' }
  ])
  const [loading, setLoading] = useState(false)
  const [routingTo, setRoutingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, routingTo])

  const handleNewChat = () => {
    setThreadId(null)
    setMessages([{ id: '0', content: WELCOME_MESSAGE, role: 'assistant' }])
    setError(null)
    setRoutingTo(null)
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
    }

    const assistantId = (Date.now() + 1).toString()
    const emergencyDetected = detectEmergency(content)

    setMessages(prev => [
      ...prev,
      userMessage,
      { id: assistantId, content: '', role: 'assistant', messageType: null, isEmergency: emergencyDetected },
    ])
    setLoading(true)
    setRoutingTo(null)
    setError(null)

    await streamChatWithAgent(content, {
      onThreadId: (id) => {
        setThreadId(id)
      },
      onMessageType: (type) => {
        setRoutingTo(type)
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, messageType: type } : m)
        )
      },
      onToken: (token) => {
        setRoutingTo(null)
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)
        )
      },
      onDone: () => {
        setLoading(false)
        setRoutingTo(null)
      },
      onError: (err) => {
        console.error('Stream error:', err)
        setError('Could not reach the medical agent. Please ensure the backend is running.')
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        setLoading(false)
        setRoutingTo(null)
      },
    }, threadId)
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

        {/* New Chat Button */}
        <div className="px-4 pt-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition-colors"
          >
            <span className="text-base">✏️</span> New Chat
          </button>
        </div>

        {/* Specialists */}
        <div className="px-4 pt-5 pb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-3">Specialists</p>
          {Object.entries(SPECIALIST_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${routingTo === key ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}>
              <span className="text-base">{cfg.icon}</span>
              <div>
                <span className={`text-sm font-medium capitalize ${cfg.color}`}>{key}</span>
                <p className="text-xs text-slate-400">{cfg.description}</p>
              </div>
              {routingTo === key && (
                <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Demo Prompts */}
        <div className="px-4 pt-2 pb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-3">Try These</p>
          {DEMO_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => handleSendMessage(prompt.text)}
              disabled={loading}
              className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <span className="text-sm">{SPECIALIST_CONFIG[prompt.specialist]?.icon}</span>
              <span className="text-xs text-slate-600 group-hover:text-slate-800 leading-snug">{prompt.label}</span>
            </button>
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
          {/* Mobile New Chat */}
          <button
            onClick={handleNewChat}
            className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-colors"
          >
            ✏️ New Chat
          </button>
          {/* Memory badge — appears after first message */}
          {threadId && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium">
              <span>🧠</span>
              <span>Memory active</span>
            </div>
          )}
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

            {/* Routing indicator */}
            {routingTo && (
              <div className="flex items-center gap-2 text-sm text-slate-500 px-1 animate-pulse">
                <span>{SPECIALIST_CONFIG[routingTo]?.icon ?? '🩺'}</span>
                <span>Routing to <span className="font-medium capitalize text-slate-700">{routingTo}</span> specialist…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Demo prompt chips — visible when no messages yet */}
        {messages.length <= 1 && !loading && (
          <div className="px-6 pb-2">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {DEMO_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSendMessage(prompt.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-xs text-slate-600 hover:text-indigo-700 transition-colors shadow-sm"
                >
                  <span>{SPECIALIST_CONFIG[prompt.specialist]?.icon}</span>
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={loading}
        />
      </div>
    </div>
  )
}
