"use client"

import { useEffect, useState } from "react"
// Importar el componente SocketStatus en la parte superior del archivo
import { SocketStatus } from "@/components/socket-status"
// Importar el componente ServerStatusModal en la parte superior del archivo
import { ServerStatusModal } from "@/components/server-status-modal"
import { io } from "socket.io-client"

// Socket.IO client management
class SocketManager {
  constructor() {
    this.socket = null
    this.isConnected = false
  }

  connect() {
    if (!this.socket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "https://e421-179-33-3-12.ngrok-free.app"
      console.log("Conectando a Socket.IO en:", socketUrl)

      this.socket = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ["websocket", "polling"],
      })

      this.socket.on("connect", () => {
        console.log("Connected to server:", this.socket.id)
        this.isConnected = true

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

      this.socket.on("chat-message", (data) => {
        console.log("Chat message received:", data)
        if (window.meetApp && window.meetApp.ui) {
          window.meetApp.ui.addChatMessage(data)
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
}

// WebRTC Manager
class WebRTCManager {
  constructor() {
    this.localStream = null
    this.isVideoEnabled = true
    this.isAudioEnabled = true
    this.isScreenSharing = false
    this.localVideo = null
  }

  async initialize() {
    try {
      this.localVideo = document.getElementById("local-video")
      await this.getUserMedia()
      return true
    } catch (error) {
      console.error("Error initializing WebRTC:", error)
      return false
    }
  }

  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      if (this.localVideo) {
        this.localVideo.srcObject = this.localStream
      }
      return this.localStream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      throw error
    }
  }

  async toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        this.isVideoEnabled = videoTrack.enabled
      }
    }
    this.updateVideoButton()
  }

  async toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        this.isAudioEnabled = audioTrack.enabled
      }
    }
    this.updateMuteButton()
  }

  updateMuteButton() {
    const muteBtn = document.getElementById("mute-btn")
    const icon = muteBtn?.querySelector("i")

    if (muteBtn && icon) {
      if (this.isAudioEnabled) {
        muteBtn.classList.remove("bg-red-600")
        muteBtn.classList.add("bg-gray-700")
        icon.className = "fas fa-microphone"
        muteBtn.title = "Mute"
      } else {
        muteBtn.classList.remove("bg-gray-700")
        muteBtn.classList.add("bg-red-600")
        icon.className = "fas fa-microphone-slash"
        muteBtn.title = "Unmute"
      }
    }
  }

  updateVideoButton() {
    const videoBtn = document.getElementById("video-btn")
    const icon = videoBtn?.querySelector("i")

    if (videoBtn && icon) {
      if (this.isVideoEnabled) {
        videoBtn.classList.remove("bg-red-600")
        videoBtn.classList.add("bg-gray-700")
        icon.className = "fas fa-video"
        videoBtn.title = "Turn off camera"
      } else {
        videoBtn.classList.remove("bg-gray-700")
        videoBtn.classList.add("bg-red-600")
        icon.className = "fas fa-video-slash"
        videoBtn.title = "Turn on camera"
      }
    }
  }
}

// Recording Manager
class RecordingManager {
  constructor() {
    this.isRecording = false
  }

  async startRecording() {
    console.log("Recording started")
    this.isRecording = true
    this.updateRecordingUI()
    return true
  }

  stopRecording() {
    console.log("Recording stopped")
    this.isRecording = false
    this.updateRecordingUI()
  }

  updateRecordingUI() {
    const recordBtn = document.getElementById("record-btn")
    if (recordBtn) {
      if (this.isRecording) {
        recordBtn.classList.remove("bg-gray-700")
        recordBtn.classList.add("bg-red-600")
        recordBtn.title = "Stop recording"
      } else {
        recordBtn.classList.remove("bg-red-600")
        recordBtn.classList.add("bg-gray-700")
        recordBtn.title = "Start recording"
      }
    }
  }
}

// Cambiar el nombre de la clase UIManager a MeetUIManager
class MeetUIManager {
  constructor() {
    this.isWhiteboardOpen = false
    this.isChatOpen = false
  }

  initialize() {
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Chat toggle
    const chatBtn = document.getElementById("chat-btn")
    const closeChat = document.getElementById("close-chat")

    if (chatBtn) {
      chatBtn.addEventListener("click", () => this.toggleChat())
    }
    if (closeChat) {
      closeChat.addEventListener("click", () => this.toggleChat())
    }

    // Chat input
    const chatInput = document.getElementById("chat-input")
    const sendChatBtn = document.getElementById("send-chat-btn")

    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          this.sendChatMessage()
        }
      })

      chatInput.addEventListener("input", (e) => {
        if (sendChatBtn) {
          sendChatBtn.disabled = !e.target.value.trim()
        }
      })
    }

    if (sendChatBtn) {
      sendChatBtn.addEventListener("click", () => this.sendChatMessage())
    }
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen
    const chatPanel = document.getElementById("chat-panel")
    const chatBtn = document.getElementById("chat-btn")

    if (chatPanel && chatBtn) {
      if (this.isChatOpen) {
        chatPanel.classList.remove("hidden")
        chatBtn.classList.add("bg-blue-600")
        chatBtn.classList.remove("bg-gray-700")

        setTimeout(() => {
          const chatInput = document.getElementById("chat-input")
          if (chatInput) {
            chatInput.focus()
          }
        }, 100)
      } else {
        chatPanel.classList.add("hidden")
        chatBtn.classList.remove("bg-blue-600")
        chatBtn.classList.add("bg-gray-700")
      }
    }
  }

  sendChatMessage() {
    const chatInput = document.getElementById("chat-input")
    const sendChatBtn = document.getElementById("send-chat-btn")

    if (!chatInput) {
      console.error("Chat input not found")
      return
    }

    const message = chatInput.value.trim()
    if (!message) {
      console.log("Empty message, not sending")
      return
    }

    console.log("Attempting to send message:", message)

    if (!window.socketManager) {
      console.error("SocketManager not available")
      return
    }

    if (!window.socketManager.socket || !window.socketManager.socket.connected) {
      console.error("Socket not connected")
      return
    }

    if (sendChatBtn) {
      sendChatBtn.disabled = true
    }

    const success = window.socketManager.sendChatMessage(message)

    if (success) {
      chatInput.value = ""
      console.log("Message sent successfully")

      this.addChatMessage({
        userId: window.meetApp.currentUser.id,
        userName: window.meetApp.currentUser.name + " (You)",
        message: message,
        timestamp: new Date().toISOString(),
        isLocal: true,
      })
    } else {
      console.error("Failed to send message")
    }

    if (sendChatBtn) {
      sendChatBtn.disabled = false
    }

    chatInput.focus()
  }

  addChatMessage(data) {
    console.log("Adding chat message:", data)

    const chatMessages = document.getElementById("chat-messages")
    if (!chatMessages) {
      console.error("Chat messages container not found")
      return
    }

    const emptyState = chatMessages.querySelector(".text-center")
    if (emptyState) {
      emptyState.remove()
    }

    const messageDiv = document.createElement("div")
    messageDiv.className = `space-y-1 p-2 rounded-lg ${data.isLocal ? "bg-blue-600/20 ml-4" : "bg-gray-700/50 mr-4"}`

    const time = new Date(data.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    messageDiv.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium ${data.isLocal ? "text-blue-300" : "text-green-400"}">${data.userName}</span>
        <span class="text-xs text-gray-400">${time}</span>
      </div>
      <div class="text-sm text-gray-200 break-words">${this.escapeHtml(data.message)}</div>
    `

    chatMessages.appendChild(messageDiv)
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  updateParticipantCount(count) {
    console.log("Updating participant count:", count)
    const participantCount = document.getElementById("participant-count")
    if (participantCount) {
      participantCount.textContent = `${count} participant${count !== 1 ? "s" : ""}`
    }
  }
}

// Whiteboard
class Whiteboard {
  constructor() {
    this.canvas = null
    this.ctx = null
  }

  init() {
    console.log("Whiteboard initialized")
  }

  resizeCanvas() {
    console.log("Canvas resized")
  }
}

// Main Meet Application
class MeetApp {
  constructor(roomId, userName, isOwner = false) {
    this.roomId = roomId
    this.userName = userName
    this.isOwner = isOwner
    this.currentUser = {
      id: "user-" + Math.random().toString(36).substr(2, 9),
      name: userName,
    }

    this.participants = new Map()
    this.webrtc = new WebRTCManager()
    this.recording = new RecordingManager()
    this.whiteboard = new Whiteboard()
    this.ui = new MeetUIManager() // Cambiar UIManager a MeetUIManager
  }

  async init() {
    console.log("Initializing MeetApp...")

    this.ui.initialize()
    await this.webrtc.initialize()
    this.whiteboard.init()
    this.setupControls()

    if (window.socketManager) {
      window.socketManager.connect()
      this.setupSocketEvents()
    }

    const userNameElement = document.getElementById("user-name")
    if (userNameElement) {
      userNameElement.textContent = this.userName
    }

    console.log("MeetApp initialized successfully")
  }

  setupControls() {
    const muteBtn = document.getElementById("mute-btn")
    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        this.webrtc.toggleAudio()
      })
    }

    const videoBtn = document.getElementById("video-btn")
    if (videoBtn) {
      videoBtn.addEventListener("click", () => {
        this.webrtc.toggleVideo()
      })
    }

    const recordBtn = document.getElementById("record-btn")
    if (recordBtn) {
      recordBtn.addEventListener("click", () => {
        this.toggleRecording()
      })
    }
  }

  setupSocketEvents() {
    if (!window.socketManager || !window.socketManager.socket) return

    const socket = window.socketManager.socket

    if (socket.connected) {
      window.socketManager.joinRoom(this.roomId, this.currentUser.id, this.currentUser.name, this.isOwner)
    } else {
      socket.on("connect", () => {
        window.socketManager.joinRoom(this.roomId, this.currentUser.id, this.currentUser.name, this.isOwner)
      })
    }
  }

  async toggleRecording() {
    if (!this.recording.isRecording) {
      const confirmed = confirm("¿Deseas iniciar la grabación de la reunión?")
      if (confirmed) {
        await this.recording.startRecording()
      }
    } else {
      const confirmed = confirm("¿Deseas detener la grabación?")
      if (confirmed) {
        this.recording.stopRecording()
      }
    }
  }

  addParticipant(data) {
    console.log("Adding participant:", data)

    if (this.participants.has(data.userId)) {
      console.log("Participant already exists, updating")
      this.participants.set(data.userId, data)
      return
    }

    if (data.userId === this.currentUser.id) {
      console.log("Not adding self as participant")
      return
    }

    this.participants.set(data.userId, data)
    this.createParticipantVideo(data.userId, data.userName)
    this.ui.updateParticipantCount(this.participants.size + 1)

    if (this.participants.size > 0) {
      const emptyState = document.getElementById("empty-state")
      if (emptyState) {
        emptyState.style.display = "none"
      }
    }
  }

  removeParticipant(userId) {
    console.log("Removing participant:", userId)

    if (!this.participants.has(userId)) {
      console.log("Participant not found")
      return
    }

    this.participants.delete(userId)
    this.removeParticipantVideo(userId)
    this.ui.updateParticipantCount(this.participants.size + 1)

    if (this.participants.size === 0) {
      const emptyState = document.getElementById("empty-state")
      if (emptyState) {
        emptyState.style.display = "block"
      }
    }
  }

  createParticipantVideo(userId, userName) {
    console.log("Creating video for participant:", userName)

    const participantsGrid = document.getElementById("participants-grid")
    if (!participantsGrid) {
      console.error("Participants grid not found")
      return
    }

    const existingParticipant = document.getElementById(`participant-${userId}`)
    if (existingParticipant) {
      console.log("Participant video already exists")
      return
    }

    const participantDiv = document.createElement("div")
    participantDiv.className = "relative bg-gray-800 rounded-xl overflow-hidden aspect-video min-h-48"
    participantDiv.id = `participant-${userId}`

    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]
    const color = colors[Math.floor(Math.random() * colors.length)]

    participantDiv.innerHTML = `
      <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${color}, ${color}88)">
        <div class="text-center text-white">
          <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <span class="text-2xl font-bold">${userName.charAt(0).toUpperCase()}</span>
          </div>
          <div class="font-medium">${userName}</div>
        </div>
      </div>
      <div class="absolute bottom-2 left-2 right-2 flex justify-between items-center">
        <span class="bg-black/70 text-white text-sm px-2 py-1 rounded font-medium">${userName}</span>
      </div>
    `

    participantsGrid.appendChild(participantDiv)

    const emptyState = document.getElementById("empty-state")
    if (emptyState) {
      emptyState.style.display = "none"
    }
  }

  removeParticipantVideo(userId) {
    const participantElement = document.getElementById(`participant-${userId}`)
    if (participantElement) {
      participantElement.remove()
    }
  }

  updateParticipantsList(participants) {
    console.log("Updating participants list:", participants)

    this.participants.clear()

    const participantsGrid = document.getElementById("participants-grid")
    if (participantsGrid) {
      const participantVideos = participantsGrid.querySelectorAll('[id^="participant-"]')
      participantVideos.forEach((video) => video.remove())
    }

    let participantCount = 0
    participants.forEach((participant) => {
      if (participant.userId !== this.currentUser.id) {
        this.addParticipant(participant)
        participantCount++
      }
    })

    this.ui.updateParticipantCount(participantCount + 1)

    if (participantCount === 0) {
      const emptyState = document.getElementById("empty-state")
      if (emptyState) {
        emptyState.style.display = "block"
      }
    } else {
      const emptyState = document.getElementById("empty-state")
      if (emptyState) {
        emptyState.style.display = "none"
      }
    }

    console.log("Participants list updated, count:", participantCount + 1)
  }
}

export default function HomePage() {
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [roomCode, setRoomCode] = useState("")
  const [userName, setUserName] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [activeRoom, setActiveRoom] = useState(null)
  const [showJoinModal, setShowJoinModal] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Actualizar la inicialización de las clases en el useEffect
  useEffect(() => {
    // Asegurar que estamos en el cliente
    setIsClient(true)

    // Generate a random username if not set
    if (!userName) {
      setUserName("User" + Math.floor(Math.random() * 10000))
    }

    // Check for room in URL
    const urlParams = new URLSearchParams(window.location.search)
    const roomFromUrl = urlParams.get("room")
    if (roomFromUrl) {
      setRoomCode(roomFromUrl)
    }

    // Initialize classes directly instead of loading scripts
    if (typeof window !== "undefined") {
      // Initialize SocketManager
      if (!window.socketManager) {
        window.socketManager = new SocketManager()
      }

      // Initialize other managers
      if (!window.WebRTCManager) {
        window.WebRTCManager = WebRTCManager
      }
      if (!window.RecordingManager) {
        window.RecordingManager = RecordingManager
      }
      if (!window.MeetUIManager) {
        // Cambiar UIManager a MeetUIManager
        window.MeetUIManager = MeetUIManager
      }
      if (!window.MeetApp) {
        window.MeetApp = MeetApp
      }
      if (!window.Whiteboard) {
        window.Whiteboard = Whiteboard
      }

      console.log("All classes initialized successfully")
    }
  }, [userName])

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(roomId)
    setActiveRoom({
      id: roomId,
      name: `${userName}'s Room`,
      createdBy: userName,
      isOwner: true,
    })
    setShowJoinModal(false)

    // Update URL with room code
    const url = new URL(window.location)
    url.searchParams.set("room", roomId)
    window.history.pushState({}, "", url)

    // Initialize the app after room is set
    setTimeout(() => {
      if (typeof window !== "undefined" && window.MeetApp) {
        window.meetApp = new window.MeetApp(roomId, userName, true)
        window.meetApp.init()
      }
    }, 500) // Increased timeout to ensure scripts are loaded
  }

  const joinRoom = () => {
    if (!roomCode.trim()) {
      setErrorMessage("Please enter a room code")
      return
    }

    setActiveRoom({
      id: roomCode,
      name: `Room ${roomCode}`,
      isOwner: false,
    })
    setShowJoinModal(false)

    // Update URL with room code
    const url = new URL(window.location)
    url.searchParams.set("room", roomCode)
    window.history.pushState({}, "", url)

    // Initialize the app after room is set
    setTimeout(() => {
      if (typeof window !== "undefined" && window.MeetApp) {
        window.meetApp = new window.MeetApp(roomCode, userName, false)
        window.meetApp.init()
      }
    }, 500) // Increased timeout to ensure scripts are loaded
  }

  const leaveRoom = () => {
    if (window.confirm("Are you sure you want to leave this room?")) {
      // Clean up URL
      const url = new URL(window.location)
      url.searchParams.delete("room")
      window.history.pushState({}, "", url)

      // Disconnect and reload
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.disconnect()
      }

      setActiveRoom(null)
      setShowJoinModal(true)
      window.location.reload()
    }
  }

  const copyInviteLink = () => {
    if (activeRoom) {
      const url = new URL(window.location)
      url.searchParams.set("room", activeRoom.id)
      navigator.clipboard.writeText(url.toString())

      // Show toast notification
      const toast = document.createElement("div")
      toast.className =
        "fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
      toast.textContent = "Invite link copied to clipboard!"
      document.body.appendChild(toast)

      setTimeout(() => {
        toast.remove()
      }, 3000)
    }
  }

  const deleteRoom = () => {
    if (!activeRoom?.isOwner) return

    if (window.confirm("Are you sure you want to delete this room? All participants will be disconnected.")) {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.emit("delete-room", { roomId: activeRoom.id })

        // Clean up URL
        const url = new URL(window.location)
        url.searchParams.delete("room")
        window.history.pushState({}, "", url)

        setActiveRoom(null)
        setShowJoinModal(true)
        window.location.reload()
      }
    }
  }

  // No renderizar hasta que estemos en el cliente
  if (!isClient) {
    return <div>Loading...</div>
  }

  return (
    <>
      {/* Join/Create Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-2xl max-w-md mx-4 w-full border border-gray-700">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-video text-2xl text-white"></i>
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Join a Meeting</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter room code"
                />
              </div>

              {errorMessage && <div className="text-red-500 text-sm">{errorMessage}</div>}

              <div className="flex flex-col space-y-3 pt-4">
                <button
                  onClick={joinRoom}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Join Room
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-gray-600 flex-grow"></div>
                  <span className="px-4 text-gray-400 text-sm">or</span>
                  <div className="border-t border-gray-600 flex-grow"></div>
                </div>

                <button
                  onClick={createRoom}
                  className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Create New Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Meeting UI */}
      <div id="meet-container" className="h-screen flex flex-col bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 px-6 py-3 flex justify-between items-center border-b border-gray-700 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <i className="fas fa-video text-2xl text-white"></i>
              </div>
              <h1 className="text-xl font-semibold text-white">Meet Clone Pro</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <i className="fas fa-users"></i>
              <span id="participant-count">1 participant</span>
            </div>
            {activeRoom && (
              <div className="flex items-center space-x-2 text-sm bg-gray-700 px-3 py-1 rounded-full">
                <i className="fas fa-door-open text-xs"></i>
                <span className="text-gray-200">{activeRoom.id}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span id="user-name" className="text-sm font-medium text-gray-200">
              {userName || "Loading..."}
            </span>
            {/* Reemplazar el div con id="connection-status" con el componente SocketStatus */}
            <SocketStatus />
            <div
              id="recording-status"
              className="hidden flex items-center space-x-2 text-xs bg-red-600 px-3 py-1 rounded-full"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Recording</span>
              <span id="recording-time">00:00</span>
            </div>

            {/* Room Actions Dropdown */}
            {activeRoom && (
              <div className="relative group">
                <button className="text-gray-300 hover:text-white">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 hidden group-hover:block z-50">
                  <div className="py-1">
                    <button
                      onClick={copyInviteLink}
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center"
                    >
                      <i className="fas fa-link mr-2"></i> Copy Invite Link
                    </button>

                    {activeRoom.isOwner && (
                      <button
                        onClick={deleteRoom}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center"
                      >
                        <i className="fas fa-trash-alt mr-2"></i> Delete Room
                      </button>
                    )}

                    <button
                      onClick={leaveRoom}
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center"
                    >
                      <i className="fas fa-sign-out-alt mr-2"></i> Leave Room
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Video area */}
          <div className="flex-1 relative bg-gray-900">
            {/* Local video */}
            <div id="local-video-container" className="absolute bottom-6 right-6 z-20">
              <div className="relative group">
                <video
                  id="local-video"
                  className="w-48 h-36 bg-gray-800 rounded-xl border-2 border-gray-600 object-cover shadow-2xl transition-all duration-300 group-hover:border-blue-500"
                  autoPlay
                  muted
                  playsInline
                ></video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl pointer-events-none"></div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                  <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-md font-medium">You</span>
                  <div className="flex space-x-1">
                    <button id="local-mute-indicator" className="hidden bg-red-500 text-white p-1 rounded-md text-xs">
                      <i className="fas fa-microphone-slash"></i>
                    </button>
                    <button id="local-video-indicator" className="hidden bg-red-500 text-white p-1 rounded-md text-xs">
                      <i className="fas fa-video-slash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Participants grid */}
            <div id="participants-grid" className="h-full p-6 grid gap-4 place-content-center">
              {/* Empty state */}
              <div id="empty-state" className="text-center text-gray-400">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-users text-3xl text-gray-600"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">Waiting for others to join</h3>
                <p className="text-gray-500 mb-4">Share the meeting link to invite participants</p>
                {activeRoom && (
                  <button
                    onClick={copyInviteLink}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center mx-auto"
                  >
                    <i className="fas fa-link mr-2"></i> Copy Invite Link
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Whiteboard panel */}
          <div id="whiteboard-panel" className="hidden w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Whiteboard</h3>
                <button id="close-whiteboard" className="text-gray-400 hover:text-white transition-colors">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <button
                  id="pen-tool"
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                  title="Pen"
                >
                  <i className="fas fa-pen text-sm"></i>
                </button>
                <button
                  id="eraser-tool"
                  className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  title="Eraser"
                >
                  <i className="fas fa-eraser text-sm"></i>
                </button>
                <input
                  type="color"
                  id="color-picker"
                  defaultValue="#3b82f6"
                  className="w-8 h-8 rounded border-0 cursor-pointer"
                  title="Color"
                />
                <input
                  type="range"
                  id="size-slider"
                  min="1"
                  max="20"
                  defaultValue="3"
                  className="flex-1 min-w-16"
                  title="Size"
                />
                <button
                  id="clear-tool"
                  className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                  title="Clear All"
                >
                  <i className="fas fa-trash text-sm"></i>
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <canvas
                id="whiteboard-canvas"
                className="w-full h-full bg-white rounded-lg shadow-inner cursor-crosshair"
              ></canvas>
            </div>
          </div>

          {/* Chat panel - MEJORADO */}
          <div id="chat-panel" className="hidden w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Chat</h3>
              <button id="close-chat" className="text-gray-400 hover:text-white transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div id="chat-messages" className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="text-center text-gray-500 text-sm">
                <i className="fas fa-comment-dots text-2xl mb-2 block"></i>
                No messages yet. Start the conversation!
              </div>
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="chat-input"
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  maxLength="500"
                />
                <button
                  id="send-chat-btn"
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">Press Enter to send</div>
            </div>
          </div>
        </main>

        {/* Controls */}
        <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            {/* Left controls */}
            <div className="flex space-x-3">
              <button
                id="mute-btn"
                className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Mute"
              >
                <i className="fas fa-microphone"></i>
              </button>
              <button
                id="video-btn"
                className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Turn off camera"
              >
                <i className="fas fa-video"></i>
              </button>
              <button
                id="screen-btn"
                className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Share screen"
              >
                <i className="fas fa-desktop"></i>
              </button>
            </div>

            {/* Center controls */}
            <div className="flex space-x-3">
              <button
                id="record-btn"
                className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Start recording"
              >
                <i className="fas fa-record-vinyl"></i>
              </button>
              <button
                id="whiteboard-btn"
                className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Whiteboard"
              >
                <i className="fas fa-chalkboard"></i>
              </button>
              <button
                id="chat-btn"
                className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Chat"
              >
                <i className="fas fa-comment"></i>
              </button>
              <button
                id="settings-btn"
                className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Settings"
              >
                <i className="fas fa-cog"></i>
              </button>
            </div>

            {/* Right controls */}
            <div className="flex space-x-3">
              <button
                id="end-call-btn"
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all duration-200 hover:scale-105"
                title="Leave meeting"
                onClick={leaveRoom}
              >
                <i className="fas fa-phone-slash"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Media permission modal */}
        <div id="permission-modal" className="hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-2xl max-w-md mx-4 text-center border border-gray-700">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-video text-2xl text-white"></i>
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white">Camera and Microphone Access</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              This application needs access to your camera and microphone to work properly. Your privacy is important to
              us.
            </p>
            <div className="flex space-x-3">
              <button
                id="grant-permission-btn"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Grant Access
              </button>
              <button
                id="deny-permission-btn"
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Join without media
              </button>
            </div>
          </div>
        </div>

        {/* Settings modal */}
        <div id="settings-modal" className="hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-2xl max-w-lg mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Settings</h3>
              <button id="close-settings" className="text-gray-400 hover:text-white transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Camera</label>
                <select
                  id="camera-select"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option>Loading cameras...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Microphone</label>
                <select
                  id="microphone-select"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option>Loading microphones...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Video Quality</label>
                <select
                  id="quality-select"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="720p">HD (720p)</option>
                  <option value="480p">SD (480p)</option>
                  <option value="360p">Low (360p)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                id="apply-settings"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Recording notification */}
        <div
          id="recording-notification"
          className="hidden fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-40"
        >
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">Recording in progress...</span>
          </div>
        </div>
      </div>

      {/* Modal de estado del servidor */}
      <ServerStatusModal />
    </>
  )
}
