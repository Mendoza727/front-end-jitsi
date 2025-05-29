// src/app/layout.js

import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Tu App',
  description: 'Con Jitsi Meet',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <Script
          src="https://meet.jit.si/libs/lib-jitsi-meet.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
