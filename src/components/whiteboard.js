"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { getSocket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eraser, Pencil, Trash2 } from "lucide-react"

export function Whiteboard() {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState(null)
  const [color, setColor] = useState("#000000")
  const [lineWidth, setLineWidth] = useState(2)
  const socket = getSocket()

  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
    }
    return ctx
  }, [])

  const drawLine = useCallback(
    (x0, y0, x1, y1, drawColor, drawLineWidth) => {
      const ctx = getContext()
      if (!ctx) return

      ctx.beginPath()
      ctx.strokeStyle = drawColor
      ctx.lineWidth = drawLineWidth
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      ctx.closePath()
    },
    [getContext],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      // Set canvas dimensions for high-res drawing
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
    }

    const handleDrawing = (data) => {
      drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.lineWidth)
    }

    const handleClear = () => {
      const ctx = getContext()
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      }
    }

    socket.on("drawing", handleDrawing)
    socket.on("clear whiteboard", handleClear)

    return () => {
      socket.off("drawing", handleDrawing)
      socket.off("clear whiteboard", handleClear)
    }
  }, [socket, drawLine, getContext])

  const getMousePos = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e) => {
    setIsDrawing(true)
    const { x, y } = getMousePos(e)
    setLastPos({ x, y })
  }

  const draw = (e) => {
    if (!isDrawing || !lastPos) return
    const { x, y } = getMousePos(e)
    drawLine(lastPos.x, lastPos.y, x, y, color, lineWidth)
    socket.emit("drawing", {
      x0: lastPos.x,
      y0: lastPos.y,
      x1: x,
      y1: y,
      color,
      lineWidth,
    })
    setLastPos({ x, y })
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    setLastPos(null)
  }

  const clearWhiteboard = () => {
    const ctx = getContext()
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      socket.emit("clear whiteboard")
    }
  }

  return (
    <Card className="flex flex-col h-[400px] w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Shared Whiteboard</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={color === "#000000" && lineWidth !== 10 ? "default" : "outline"}
            size="icon"
            onClick={() => {
              setColor("#000000")
              setLineWidth(2)
            }}
            aria-label="Pencil tool"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={lineWidth === 10 ? "default" : "outline"}
            size="icon"
            onClick={() => {
              setColor("#FFFFFF") // Assuming white background for eraser
              setLineWidth(10)
            }}
            aria-label="Eraser tool"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={clearWhiteboard} aria-label="Clear whiteboard">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full border rounded-b-lg cursor-crosshair"
          style={{ touchAction: "none" }} // Prevent default touch actions
        />
      </CardContent>
    </Card>
  )
}
