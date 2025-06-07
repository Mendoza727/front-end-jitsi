"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, Server, RefreshCw } from "lucide-react"

export function ServerStatusModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkServerStatus = async () => {
    setIsChecking(true)
    try {
      const response = await fetch("/api/socket-check")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        status: "error",
        message: error.message,
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Verificar el estado del servidor cuando se monta el componente
    checkServerStatus()

    // Si el servidor no está disponible, mostrar el modal
    const timer = setTimeout(() => {
      if (status && status.status !== "200") {
        setIsOpen(true)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Estado del Servidor Socket.IO
          </DialogTitle>
          <DialogDescription>Se ha detectado un problema con la conexión al servidor Socket.IO.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {status ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-md ${status.status === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {status.status === "ok" ? (
                    <>Servidor disponible</>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5" />
                      Servidor no disponible
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm">{status.status === "ok" ? `Conectado a ${status.url}` : status.message}</p>
              </div>

              <div className="text-sm space-y-2">
                <p className="font-medium">Posibles soluciones:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Asegúrate de que el servidor Socket.IO esté ejecutándose en {status.url || " https://e421-179-33-3-12.ngrok-free.app"}
                  </li>
                  <li>Verifica que no haya problemas de CORS en el servidor</li>
                  <li>Comprueba que el puerto 3001 esté abierto y accesible</li>
                  <li>Reinicia el servidor Socket.IO</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between">
          <Button
            variant="outline"
            onClick={checkServerStatus}
            disabled={isChecking}
            className="flex items-center gap-2"
          >
            {isChecking && <RefreshCw className="h-4 w-4 animate-spin" />}
            Verificar de nuevo
          </Button>
          <Button onClick={() => setIsOpen(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
