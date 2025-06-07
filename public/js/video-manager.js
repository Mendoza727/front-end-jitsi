// Video management (simulation for demo purposes)
class VideoManager {
  constructor() {
    this.localStream = null
    this.participants = new Map()
  }

  async initializeLocalVideo() {
    try {
      // In a real implementation, you would use:
      // this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // For demo purposes, we'll simulate video with a placeholder
      this.simulateLocalVideo()
      return true
    } catch (error) {
      console.error("Error accessing media devices:", error)
      this.simulateLocalVideo()
      return false
    }
  }

  simulateLocalVideo() {
    const localVideo = document.getElementById("local-video")
    if (localVideo) {
      // Create a canvas for simulated video
      const canvas = document.createElement("canvas")
      canvas.width = 320
      canvas.height = 240
      const ctx = canvas.getContext("2d")

      // Animate a simple pattern
      let hue = 0
      const animate = () => {
        ctx.fillStyle = `hsl(${hue}, 50%, 50%)`
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = "white"
        ctx.font = "20px Arial"
        ctx.textAlign = "center"
        ctx.fillText("You", canvas.width / 2, canvas.height / 2)

        hue = (hue + 1) % 360
        requestAnimationFrame(animate)
      }
      animate()

      // Convert canvas to video stream (simulation)
      localVideo.style.background = `url(${canvas.toDataURL()})`
      localVideo.style.backgroundSize = "cover"
    }
  }

  addParticipantVideo(userId, userName) {
    const participantVideo = this.createParticipantVideoElement(userId, userName)
    document.getElementById("participants-grid").appendChild(participantVideo)

    // Simulate remote video
    this.simulateRemoteVideo(userId, userName)
  }

  createParticipantVideoElement(userId, userName) {
    const participantDiv = document.createElement("div")
    participantDiv.className = "participant-video"
    participantDiv.id = `participant-${userId}`

    participantDiv.innerHTML = `
      <div class="video-container">
        <div class="video-placeholder" id="video-${userId}"></div>
        <div class="participant-name">${userName}</div>
        <div class="participant-controls">
          <button class="control-btn mute-btn" title="Mute">
            <i class="fas fa-microphone"></i>
          </button>
        </div>
      </div>
    `

    return participantDiv
  }

  simulateRemoteVideo(userId, userName) {
    const videoElement = document.getElementById(`video-${userId}`)
    if (videoElement) {
      const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
      const color = colors[Math.floor(Math.random() * colors.length)]

      videoElement.style.background = `linear-gradient(45deg, ${color}, ${color}88)`
      videoElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-weight: bold;">
          ${userName.charAt(0).toUpperCase()}
        </div>
      `
    }
  }

  removeParticipantVideo(userId) {
    const participantElement = document.getElementById(`participant-${userId}`)
    if (participantElement) {
      participantElement.remove()
    }
  }
}
