// Main Meet Application - Versión actualizada con todas las funcionalidades
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
    this.ui = new UIManager()
  }

  async init() {
    console.log("Initializing MeetApp...")

    // Initialize UI
    this.ui.initialize()

    // Initialize WebRTC
    await this.webrtc.initialize()

    // Initialize whiteboard
    this.whiteboard.init()

    // Setup controls
    this.setupControls()

    // Connect to socket
    if (window.socketManager) {
      window.socketManager.connect()
      this.setupSocketEvents()
    }

    // Set user name in UI
    const userNameElement = document.getElementById("user-name")
    if (userNameElement) {
      userNameElement.textContent = this.userName
    }

    console.log("MeetApp initialized successfully")
  }

  setupControls() {
    // Mute/Unmute button
    const muteBtn = document.getElementById("mute-btn")
    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        this.webrtc.toggleAudio()
      })
    }

    // Video on/off button
    const videoBtn = document.getElementById("video-btn")
    if (videoBtn) {
      videoBtn.addEventListener("click", () => {
        this.webrtc.toggleVideo()
      })
    }

    // Screen share button
    const screenBtn = document.getElementById("screen-btn")
    if (screenBtn) {
      screenBtn.addEventListener("click", () => {
        this.webrtc.toggleScreenShare()
      })
    }

    // Recording button
    const recordBtn = document.getElementById("record-btn")
    if (recordBtn) {
      recordBtn.addEventListener("click", () => {
        this.toggleRecording()
      })
    }

    // End call button
    const endCallBtn = document.getElementById("end-call-btn")
    if (endCallBtn) {
      endCallBtn.addEventListener("click", () => {
        this.endCall()
      })
    }
  }

  setupSocketEvents() {
    if (!window.socketManager || !window.socketManager.socket) return

    const socket = window.socketManager.socket

    socket.on("user-joined", (data) => {
      this.addParticipant(data)
    })

    socket.on("user-left", (data) => {
      this.removeParticipant(data.userId)
    })

    socket.on("chat-message", (data) => {
      this.ui.addChatMessage(data)
    })

    socket.on("participants-list", (participants) => {
      this.updateParticipantsList(participants)
    })

    // Join room
    socket.emit("join-room", {
      roomId: this.roomId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
    })
  }

  async toggleRecording() {
    if (!this.recording.isRecording) {
      // Start recording
      if (this.webrtc.localStream) {
        const success = await this.recording.startRecording(this.webrtc.localStream)
        if (success) {
          console.log("Recording started successfully")
        }
      }
    } else {
      // Stop recording
      this.recording.stopRecording()
    }
  }

  addParticipant(data) {
    this.participants.set(data.userId, data)
    this.createParticipantVideo(data.userId, data.userName)
    this.ui.updateParticipantCount(this.participants.size + 1)
    this.ui.hideEmptyState()
  }

  removeParticipant(userId) {
    this.participants.delete(userId)
    this.removeParticipantVideo(userId)
    this.ui.updateParticipantCount(this.participants.size + 1)

    if (this.participants.size === 0) {
      this.ui.showEmptyState()
    }
  }

  createParticipantVideo(userId, userName) {
    const participantsGrid = document.getElementById("participants-grid")
    if (!participantsGrid) return

    const participantDiv = document.createElement("div")
    participantDiv.className = "relative bg-gray-800 rounded-xl overflow-hidden aspect-video min-h-48"
    participantDiv.id = `participant-${userId}`

    // Generate a random color for the participant
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
        <div class="flex space-x-1">
          <div class="bg-red-500 text-white p-1 rounded text-xs hidden" id="participant-mute-${userId}">
            <i class="fas fa-microphone-slash"></i>
          </div>
          <div class="bg-red-500 text-white p-1 rounded text-xs hidden" id="participant-video-${userId}">
            <i class="fas fa-video-slash"></i>
          </div>
        </div>
      </div>
    `

    participantsGrid.appendChild(participantDiv)
  }

  removeParticipantVideo(userId) {
    const participantElement = document.getElementById(`participant-${userId}`)
    if (participantElement) {
      participantElement.remove()
    }
  }

  updateParticipantsList(participants) {
    // Clear existing participants
    this.participants.clear()
    const participantsGrid = document.getElementById("participants-grid")
    if (participantsGrid) {
      // Remove all participant videos but keep empty state
      const participantVideos = participantsGrid.querySelectorAll('[id^="participant-"]')
      participantVideos.forEach((video) => video.remove())
    }

    // Add all participants
    participants.forEach((participant) => {
      if (participant.userId !== this.currentUser.id) {
        this.addParticipant(participant)
      }
    })

    if (participants.length <= 1) {
      this.ui.showEmptyState()
    }
  }

  endCall() {
    if (confirm("Are you sure you want to leave the meeting?")) {
      // Stop recording if active
      if (this.recording.isRecording) {
        this.recording.stopRecording()
      }

      // Stop local stream
      if (this.webrtc.localStream) {
        this.webrtc.localStream.getTracks().forEach((track) => track.stop())
      }

      // Disconnect socket
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.disconnect()
      }

      // Reload page or redirect
      window.location.reload()
    }
  }
}

// Make MeetApp available globally
window.MeetApp = MeetApp
