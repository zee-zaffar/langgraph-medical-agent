'use client'

import { useEffect } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Verify backend is accessible
    const checkBackend = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/health`)
        if (!response.ok) {
          console.warn('Backend health check failed')
        }
      } catch (error) {
        console.warn('Could not connect to backend:', error)
      }
    }

    checkBackend()
  }, [])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Medical Assistant Agent</title>
        <meta name="description" content="AI-powered medical assistant" />
      </head>
      <body className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
