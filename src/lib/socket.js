"use client"

import { io } from "socket.io-client"

let socket = null

export const getSocket = () => {
  if (!socket) {
    // Usar variable de entorno o fallback a localhost
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "https://e421-179-33-3-12.ngrok-free.app"
    console.log("Conectando a Socket.IO en:", socketUrl)

    // Opciones mejoradas para Socket.IO
    socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ["websocket", "polling"], // Intentar websocket primero, luego polling
    })

    socket.on("connect", () => {
      console.log("✅ Conectado a Socket.IO server:", socket.id)
    })

    socket.on("disconnect", (reason) => {
      console.log("❌ Desconectado de Socket.IO server:", reason)
    })

    socket.on("connect_error", (err) => {
      console.error("🔴 Socket.IO error de conexión:", err.message)
    })

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Intento de reconexión ${attempt}...`)
    })

    socket.on("reconnect", (attempts) => {
      console.log(`✅ Reconectado después de ${attempts} intentos`)
    })

    socket.on("reconnect_failed", () => {
      console.error("🔴 Falló la reconexión después de múltiples intentos")
    })
  }
  return socket
}

// Función para verificar si el servidor está disponible
export const checkServerStatus = async () => {
  try {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || " https://e421-179-33-3-12.ngrok-free.app"
    const response = await fetch(`${socketUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      mode: "cors",
    })

    if (response.ok) {
      const data = await response.json()
      console.log("Estado del servidor:", data)
      return { ok: true, data }
    } else {
      return { ok: false, error: `Error ${response.status}: ${response.statusText}` }
    }
  } catch (error) {
    console.error("Error verificando estado del servidor:", error)
    return { ok: false, error: error.message }
  }
}

// Función para reconectar manualmente
export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket.connect()
    return true
  }
  return false
}
