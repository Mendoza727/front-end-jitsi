  // Main Meet application
  class MeetApp {
    constructor() {
      this.currentUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        name: "User " + Math.floor(Math.random() * 1000),
      }

      this.participants = new Map()
      this.videoManager = new VideoManager()
      this.whiteboard = new Whiteboard()
      this.isWhiteboardOpen = false
      this.isChatOpen = false
      this.isMuted = false
      this.isVideoOff = false
    }

    async init() {
      this.setupUI()
      this.setupControls()
      await this.videoManager.initializeLocalVideo()
      this.whiteboard.init()
      socketManager.connect()

      // Set user name
      document.getElementById("user-name").textContent = this.currentUser.name
    }

    setupUI() {
      // Initialize UI state
      document.getElementById("whiteboard-panel").style.display = "none"
      document.getElementById("chat-panel").style.display = "none"
    }

    setupControls() {
      // Mute/Unmute
      document.getElementById("mute-btn").addEventListener("click", () => {
        this.toggleMute()
      })

      // Video on/off
      document.getElementById("video-btn").addEventListener("click", () => {
        this.toggleVideo()
      })

      // Screen share
      document.getElementById("screen-btn").addEventListener("click", () => {
        this.toggleScreenShare()
      })

      // Whiteboard toggle
      document.getElementById("whiteboard-btn").addEventListener("click", () => {
        this.toggleWhiteboard()
      })

      // Chat toggle
      document.getElementById("chat-btn").addEventListener("click", () => {
        this.toggleChat()
      })

      // End call
      document.getElementById("end-call-btn").addEventListener("click", () => {
        this.endCall()
      })

      // Chat input
      document.getElementById("chat-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.sendChatMessage()
        }
      })

      document.getElementById("send-chat-btn").addEventListener("click", () => {
        this.sendChatMessage()
      })
    }

    toggleMute() {
      this.isMuted = !this.isMuted
      const muteBtn = document.getElementById("mute-btn")
      const icon = muteBtn.querySelector("i")

      if (this.isMuted) {
        muteBtn.classList.add("muted")
        icon.className = "fas fa-microphone-slash"
        muteBtn.title = "Unmute"
      } else {
        muteBtn.classList.remove("muted")
        icon.className = "fas fa-microphone"
        muteBtn.title = "Mute"
      }
    }

    toggleVideo() {
      this.isVideoOff = !this.isVideoOff
      const videoBtn = document.getElementById("video-btn")
      const icon = videoBtn.querySelector("i")
      const localVideo = document.getElementById("local-video")

      if (this.isVideoOff) {
        videoBtn.classList.add("video-off")
        icon.className = "fas fa-video-slash"
        videoBtn.title = "Turn on camera"
        localVideo.style.background = "#333"
        localVideo.innerHTML =
          '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white;">Camera Off</div>'
      } else {
        videoBtn.classList.remove("video-off")
        icon.className = "fas fa-video"
        videoBtn.title = "Turn off camera"
        localVideo.innerHTML = ""
        this.videoManager.simulateLocalVideo()
      }
    }

    toggleScreenShare() {
      const screenBtn = document.getElementById("screen-btn")
      const icon = screenBtn.querySelector("i")

      // Toggle screen share state (simulation)
      screenBtn.classList.toggle("sharing")
      if (screenBtn.classList.contains("sharing")) {
        icon.className = "fas fa-stop"
        screenBtn.title = "Stop sharing"
      } else {
        icon.className = "fas fa-desktop"
        screenBtn.title = "Share screen"
      }
    }

    toggleWhiteboard() {
      this.isWhiteboardOpen = !this.isWhiteboardOpen
      const whiteboardPanel = document.getElementById("whiteboard-panel")
      const whiteboardBtn = document.getElementById("whiteboard-btn")

      if (this.isWhiteboardOpen) {
        whiteboardPanel.style.display = "flex"
        whiteboardBtn.classList.add("active")
        this.whiteboard.resizeCanvas()
      } else {
        whiteboardPanel.style.display = "none"
        whiteboardBtn.classList.remove("active")
      }
    }

    toggleChat() {
      this.isChatOpen = !this.isChatOpen
      const chatPanel = document.getElementById("chat-panel")
      const chatBtn = document.getElementById("chat-btn")

      if (this.isChatOpen) {
        chatPanel.style.display = "flex"
        chatBtn.classList.add("active")
      } else {
        chatPanel.style.display = "none"
        chatBtn.classList.remove("active")
      }
    }

    sendChatMessage() {
      const input = document.getElementById("chat-input")
      const message = input.value.trim()

      if (message) {
        socketManager.sendChatMessage(message)
        input.value = ""
      }
    }

    addChatMessage(data) {
      const chatMessages = document.getElementById("chat-messages")
      const messageDiv = document.createElement("div")
      messageDiv.className = "chat-message"

      const time = new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      messageDiv.innerHTML = `
        <div class="message-header">
          <span class="message-author">${data.userName}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${data.message}</div>
      `

      chatMessages.appendChild(messageDiv)
      chatMessages.scrollTop = chatMessages.scrollHeight
    }

    addParticipant(data) {
      this.participants.set(data.userId, data)
      this.videoManager.addParticipantVideo(data.userId, data.userName)
      this.updateParticipantCount()
    }

    removeParticipant(userId) {
      this.participants.delete(userId)
      this.videoManager.removeParticipantVideo(userId)
      this.updateParticipantCount()
    }

    updateParticipantsList(participants) {
      // Clear existing participants
      this.participants.clear()
      document.getElementById("participants-grid").innerHTML = ""

      // Add all participants
      participants.forEach((participant) => {
        if (participant.userId !== this.currentUser.id) {
          this.addParticipant(participant)
        }
      })
    }

    updateParticipantCount() {
      const count = this.participants.size + 1 // +1 for current user
      document.getElementById("participant-count").textContent = `${count} participant${count !== 1 ? "s" : ""}`
    }

    endCall() {
      if (confirm("Are you sure you want to leave the meeting?")) {
        window.location.reload()
      }
    }
  }

  // Initialize the app when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    window.meetApp = new MeetApp()
    window.meetApp.init()
  })
