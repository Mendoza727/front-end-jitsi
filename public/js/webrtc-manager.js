// WebRTC Manager - Manejo de video, audio y conexiones peer-to-peer
class WebRTCManager {
  constructor() {
    this.localStream = null
    this.peerConnections = new Map()
    this.isVideoEnabled = true
    this.isAudioEnabled = true
    this.isScreenSharing = false
    this.localVideo = null
    this.configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    }
  }

  async initialize() {
    try {
      this.localVideo = document.getElementById("local-video")
      await this.getUserMedia()
      return true
    } catch (error) {
      console.error("Error initializing WebRTC:", error)
      this.showPermissionModal()
      return false
    }
  }

  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      if (this.localVideo) {
        this.localVideo.srcObject = this.localStream
      }
      this.updateLocalVideoIndicators()
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
    this.updateLocalVideoIndicators()
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
    this.updateLocalVideoIndicators()
    this.updateMuteButton()
  }

  async toggleScreenShare() {
    try {
      if (!this.isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0]
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        })

        // Update local video
        if (this.localVideo) {
          this.localVideo.srcObject = screenStream
        }

        this.isScreenSharing = true

        // Listen for screen share end
        videoTrack.onended = () => {
          this.stopScreenShare()
        }
      } else {
        this.stopScreenShare()
      }
    } catch (error) {
      console.error("Error toggling screen share:", error)
    }
    this.updateScreenShareButton()
  }

  async stopScreenShare() {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      // Replace video track in all peer connections
      const videoTrack = cameraStream.getVideoTracks()[0]
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })

      // Update local video
      if (this.localVideo) {
        this.localVideo.srcObject = cameraStream
      }

      this.localStream = cameraStream
      this.isScreenSharing = false
    } catch (error) {
      console.error("Error stopping screen share:", error)
    }
  }

  updateLocalVideoIndicators() {
    const muteIndicator = document.getElementById("local-mute-indicator")
    const videoIndicator = document.getElementById("local-video-indicator")

    if (muteIndicator) {
      muteIndicator.style.display = this.isAudioEnabled ? "none" : "block"
    }
    if (videoIndicator) {
      videoIndicator.style.display = this.isVideoEnabled ? "none" : "block"
    }
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

  updateScreenShareButton() {
    const screenBtn = document.getElementById("screen-btn")
    const icon = screenBtn?.querySelector("i")

    if (screenBtn && icon) {
      if (this.isScreenSharing) {
        screenBtn.classList.remove("bg-gray-700")
        screenBtn.classList.add("bg-green-600")
        icon.className = "fas fa-stop"
        screenBtn.title = "Stop sharing"
      } else {
        screenBtn.classList.remove("bg-green-600")
        screenBtn.classList.add("bg-gray-700")
        icon.className = "fas fa-desktop"
        screenBtn.title = "Share screen"
      }
    }
  }

  showPermissionModal() {
    const modal = document.getElementById("permission-modal")
    if (modal) {
      modal.classList.remove("hidden")
    }
  }

  hidePermissionModal() {
    const modal = document.getElementById("permission-modal")
    if (modal) {
      modal.classList.add("hidden")
    }
  }

  async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return {
        cameras: devices.filter((device) => device.kind === "videoinput"),
        microphones: devices.filter((device) => device.kind === "audioinput"),
      }
    } catch (error) {
      console.error("Error getting devices:", error)
      return { cameras: [], microphones: [] }
    }
  }
}
