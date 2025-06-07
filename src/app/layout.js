// src/app/layout.js

import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <title>Meet Clone - WebRTC Pro</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-900 text-white">
        {children}
        <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
      </body>
    </html>
  )
}
