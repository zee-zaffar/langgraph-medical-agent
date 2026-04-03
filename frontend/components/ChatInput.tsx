'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSendMessage(input)
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  return (
    <footer className="bg-white border-t border-slate-200 px-6 py-4 shadow-[0_-1px_4px_rgba(0,0,0,0.04)]">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Describe your symptoms or ask a health question…"
            disabled={disabled}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50 min-h-[24px] max-h-32 leading-6"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 3.105a1.5 1.5 0 0 1 1.89-.353l12 6.5a1.5 1.5 0 0 1 0 2.596l-12 6.5a1.5 1.5 0 0 1-2.14-1.868l1.757-4.682A.5.5 0 0 1 5 11.5h5.5a.5.5 0 0 0 0-1H5a.5.5 0 0 1-.487-.382L2.756 5.223a1.5 1.5 0 0 1 .349-2.118Z" />
            </svg>
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-2">Press <kbd className="bg-slate-100 border border-slate-200 rounded px-1">Enter</kbd> to send &middot; <kbd className="bg-slate-100 border border-slate-200 rounded px-1">Shift+Enter</kbd> for new line</p>
      </div>
    </footer>
  )
}
