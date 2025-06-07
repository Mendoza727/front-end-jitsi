// Recording Manager - Manejo de grabación de video
class RecordingManager {
  constructor() {
    this.mediaRecorder = null
    this.recordedChunks = []
    this.isRecording = false
    this.startTime = null
    this.timerInterval = null
  }

  async startRecording(stream) {
    try {
      this.recordedChunks = []
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.saveRecording()
      }

      this.mediaRecorder.start()
      this.isRecording = true
      this.startTime = Date.now()
      this.startTimer()
      this.updateRecordingUI()

      console.log("Recording started")
      return true
    } catch (error) {
      console.error("Error starting recording:", error)
      return false
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.isRecording = false
      this.stopTimer()
      this.updateRecordingUI()
      console.log("Recording stopped")
    }
  }

  saveRecording() {
    if (this.recordedChunks.length > 0) {
      const blob = new Blob(this.recordedChunks, { type: "video/webm" })
      const url = URL.createObjectURL(blob)

      // Create download link
      const a = document.createElement("a")
      a.href = url
      a.download = `meeting-recording-${new Date().toISOString().slice(0, 19)}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up
      URL.revokeObjectURL(url)
      this.recordedChunks = []
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.startTime) {
        const elapsed = Date.now() - this.startTime
        const minutes = Math.floor(elapsed / 60000)
        const seconds = Math.floor((elapsed % 60000) / 1000)
        const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

        const timerElement = document.getElementById("recording-time")
        if (timerElement) {
          timerElement.textContent = timeString
        }
      }
    }, 1000)
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  updateRecordingUI() {
    const recordBtn = document.getElementById("record-btn")
    const recordingStatus = document.getElementById("recording-status")
    const recordingNotification = document.getElementById("recording-notification")

    if (this.isRecording) {
      // Update record button
      if (recordBtn) {
        recordBtn.classList.remove("bg-gray-700")
        recordBtn.classList.add("bg-red-600")
        const icon = recordBtn.querySelector("i")
        if (icon) {
          icon.className = "fas fa-stop"
        }
        recordBtn.title = "Stop recording"
      }

      // Show recording status
      if (recordingStatus) {
        recordingStatus.classList.remove("hidden")
      }

      // Show recording notification
      if (recordingNotification) {
        recordingNotification.classList.remove("hidden")
      }
    } else {
      // Update record button
      if (recordBtn) {
        recordBtn.classList.remove("bg-red-600")
        recordBtn.classList.add("bg-gray-700")
        const icon = recordBtn.querySelector("i")
        if (icon) {
          icon.className = "fas fa-record-vinyl"
        }
        recordBtn.title = "Start recording"
      }

      // Hide recording status
      if (recordingStatus) {
        recordingStatus.classList.add("hidden")
      }

      // Hide recording notification
      if (recordingNotification) {
        recordingNotification.classList.add("hidden")
      }
    }
  }
}
