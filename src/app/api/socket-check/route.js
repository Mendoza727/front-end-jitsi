import { NextResponse } from "next/server"

export async function GET(request) {
  try {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || " https://e421-179-33-3-12.ngrok-free.app"

    // Intentar hacer una solicitud al endpoint de salud del servidor Socket.IO
    const response = await fetch(`${socketUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 }, // No cachear esta solicitud
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        status: "ok",
        serverStatus: data,
        url: socketUrl,
      })
    } else {
      return NextResponse.json(
        {
          status: "error",
          message: `El servidor Socket.IO respondió con: ${response.status} ${response.statusText}`,
          url: socketUrl,
        },
        { status: 502 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: `No se pudo conectar al servidor Socket.IO: ${error.message}`,
        url: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || " https://e421-179-33-3-12.ngrok-free.app",
      },
      { status: 503 },
    )
  }
}
