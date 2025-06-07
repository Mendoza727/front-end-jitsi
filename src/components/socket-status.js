"use client"

import { useState, useEffect } from "react"
import { getSocket, checkServerStatus, reconnectSocket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

export function SocketStatus() {
  const [status, setStatus] = useState("checking")
  const [serverInfo, setServerInfo] = useState(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)

    try {
      // Verificar si el servidor está disponible
      const serverStatus = await checkServerStatus()

      if (serverStatus.ok) {
        setServerInfo(serverStatus.data)

        // Verificar si el socket está conectado
        const socket = getSocket()
        if (socket.connected) {
          setStatus("connected")
        } else {
          setStatus("server-up-socket-down")
        }
      } else {
        setStatus("server-down")
        setServerInfo({ error: serverStatus.error })
      }
    } catch (error) {
      setStatus("error")
      setServerInfo({ error: error.message })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    //checkConnection()

    const socket = getSocket()

    const handleConnect = () => setStatus("connected")
    const handleDisconnect = () => setStatus("disconnected")
    const handleError = () => setStatus("error")

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("connect_error", handleError)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("connect_error", handleError)
    }
  }, [])

  const handleReconnect = () => {
    setStatus("reconnecting")
    reconnectSocket()
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "checking" || status === "reconnecting" || isChecking ? (
        <div className="flex items-center gap-2 text-amber-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{status === "reconnecting" ? "Reconectando..." : "Verificando conexión..."}</span>
        </div>
      ) : status === "connected" ? (
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle className="h-4 w-4" />
          <span>Conectado al servidor</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>
              {status === "server-down"
                ? "Servidor no disponible"
                : status === "server-up-socket-down"
                  ? "Socket desconectado"
                  : "Error de conexión"}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={checkConnection} disabled={isChecking} className="h-7 px-2">
            Verificar
          </Button>
          <Button variant="outline" size="sm" onClick={handleReconnect} disabled={isChecking} className="h-7 px-2">
            Reconectar
          </Button>
        </div>
      )}
    </div>
  )
}
