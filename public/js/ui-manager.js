// Socket.IO client management - Actualizado con eventos de screen share y recording
class SocketManager {
  constructor() {
    this.socket = null
    this.isConnected = false
  }

  connect() {
    if (!this.socket) {
      // Usar variable de entorno o fallback a localhost
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || " https://e421-179-33-3-12.ngrok-free.app"
      console.log("Conectando a Socket.IO en:", socketUrl)

      this.socket = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ["websocket", "polling"], // Intentar websocket primero, luego polling
      })

      this.socket.on("connect", () => {
        console.log("Connected to server:", this.socket.id)
        this.isConnected = true

        // Si ya tenemos información de sala, unirse automáticamente
        if (window.meetApp && window.meetApp.roomId) {
          this.joinRoom(
            window.meetApp.roomId,
            window.meetApp.currentUser.id,
            window.meetApp.userName,
            window.meetApp.isOwner,
          )
        }
      })

      this.socket.on("disconnect", () => {
        console.log("Disconnected from server")
        this.isConnected = false
      })

      this.socket.on("user-joined", (data) => {
        console.log("User joined:", data)
        if (window.meetApp) {
          window.meetApp.addParticipant(data)
        }
      })

      this.socket.on("user-left", (data) => {
        console.log("User left:", data)
        if (window.meetApp) {
          window.meetApp.removeParticipant(data.userId)
        }
      })

      // Evento de chat corregido
      this.socket.on("chat-message", (data) => {
        console.log("Chat message received:", data)
        if (window.meetApp && window.meetApp.ui) {
          window.meetApp.ui.addChatMessage(data)
        }
      })

      this.socket.on("whiteboard-data", (data) => {
        if (window.meetApp && window.meetApp.whiteboard) {
          window.meetApp.whiteboard.handleRemoteDrawing(data)
        }
      })

      this.socket.on("whiteboard-clear", () => {
        if (window.meetApp && window.meetApp.whiteboard) {
          window.meetApp.whiteboard.clearCanvas()
        }
      })

      this.socket.on("participants-list", (participants) => {
        console.log("Received participants list:", participants)
        if (window.meetApp) {
          window.meetApp.updateParticipantsList(participants)
        }
      })

      this.socket.on("room-joined", (data) => {
        console.log("Successfully joined room:", data)
        if (window.meetApp) {
          window.meetApp.ui.updateParticipantCount(data.participantCount || 1)
        }
      })

      // Nuevos eventos para screen share
      this.socket.on("screen-share-started", (data) => {
        this.handleRemoteScreenShareStarted(data)
      })

      this.socket.on("screen-share-stopped", (data) => {
        this.handleRemoteScreenShareStopped(data)
      })

      // Nuevos eventos para recording
      this.socket.on("recording-started", (data) => {
        this.handleRemoteRecordingStarted(data)
      })

      this.socket.on("recording-stopped", (data) => {
        this.handleRemoteRecordingStopped(data)
      })

      // Manejo de errores
      this.socket.on("error", (error) => {
        console.error("Socket error:", error)
      })

      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error)
      })
    }
  }

  joinRoom(roomId, userId, userName, isRoomOwner = false) {
    if (this.socket) {
      console.log("Joining room:", roomId, "as", userName, "with ID", userId)
      this.socket.emit("join-room", {
        roomId: roomId,
        userId: userId,
        userName: userName,
        isRoomOwner: isRoomOwner,
      })
    } else {
      console.error("Cannot join room: Socket not connected")
    }
  }

  sendChatMessage(message) {
    if (!this.socket || !this.socket.connected) {
      console.error("Cannot send chat message: Socket not connected")
      return false
    }

    if (!window.meetApp) {
      console.error("Cannot send chat message: MeetApp not initialized")
      return false
    }

    const messageData = {
      roomId: window.meetApp.roomId,
      userId: window.meetApp.currentUser.id,
      userName: window.meetApp.currentUser.name,
      message: message,
      timestamp: new Date().toISOString(),
    }

    console.log("Sending chat message:", messageData)
    this.socket.emit("chat-message", messageData)
    return true
  }

  handleRemoteScreenShareStarted(data) {
    // Mostrar notificación de que alguien está compartiendo pantalla
    const notification = document.createElement("div")
    notification.className =
      "fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="fas fa-desktop"></i>
        <span>${data.userName} is sharing their screen</span>
      </div>
    `
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  handleRemoteScreenShareStopped(data) {
    // Remover cualquier indicador de screen share del participante
    console.log(`${data.userId} stopped sharing screen`)
  }

  handleRemoteRecordingStarted(data) {
    // Mostrar notificación de que alguien está grabando
    const notification = document.createElement("div")
    notification.className =
      "fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>${data.userName} started recording the meeting</span>
      </div>
    `
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 4000)
  }

  handleRemoteRecordingStopped(data) {
    // Mostrar notificación de que se detuvo la grabación
    const notification = document.createElement("div")
    notification.className =
      "fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="fas fa-stop"></i>
        <span>Recording stopped</span>
      </div>
    `
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  sendWhiteboardData(data) {
    if (this.socket) {
      this.socket.emit("whiteboard-data", data)
    }
  }

  clearWhiteboard() {
    if (this.socket) {
      this.socket.emit("whiteboard-clear")
    }
  }
}

const socketManager = new SocketManager()
window.socketManager = socketManager
