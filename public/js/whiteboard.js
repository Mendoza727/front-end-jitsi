// Whiteboard functionality
class Whiteboard {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.isDrawing = false
    this.currentTool = "pen"
    this.currentColor = "#000000"
    this.currentSize = 2
    this.lastX = 0
    this.lastY = 0
  }

  init() {
    this.canvas = document.getElementById("whiteboard-canvas")
    this.ctx = this.canvas.getContext("2d")

    // Set canvas size
    this.resizeCanvas()
    window.addEventListener("resize", () => this.resizeCanvas())

    // Drawing events
    this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e))
    this.canvas.addEventListener("mousemove", (e) => this.draw(e))
    this.canvas.addEventListener("mouseup", () => this.stopDrawing())
    this.canvas.addEventListener("mouseout", () => this.stopDrawing())

    // Touch events for mobile
    this.canvas.addEventListener("touchstart", (e) => this.handleTouch(e, "start"))
    this.canvas.addEventListener("touchmove", (e) => this.handleTouch(e, "move"))
    this.canvas.addEventListener("touchend", () => this.stopDrawing())

    this.setupTools()
  }

  resizeCanvas() {
    const container = this.canvas.parentElement
    this.canvas.width = container.clientWidth
    this.canvas.height = container.clientHeight
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"
  }

  setupTools() {
    // Pen tool
    document.getElementById("pen-tool").addEventListener("click", () => {
      this.currentTool = "pen"
      this.currentColor = "#000000"
      this.updateToolButtons()
    })

    // Eraser tool
    document.getElementById("eraser-tool").addEventListener("click", () => {
      this.currentTool = "eraser"
      this.currentColor = "#FFFFFF"
      this.updateToolButtons()
    })

    // Clear all
    document.getElementById("clear-tool").addEventListener("click", () => {
      this.clearCanvas()
      if (typeof socketManager !== "undefined") {
        socketManager.clearWhiteboard()
      }
    })

    // Color picker
    document.getElementById("color-picker").addEventListener("change", (e) => {
      if (this.currentTool === "pen") {
        this.currentColor = e.target.value
      }
    })

    // Size slider
    document.getElementById("size-slider").addEventListener("input", (e) => {
      this.currentSize = e.target.value
    })
  }

  updateToolButtons() {
    document.querySelectorAll(".tool-btn").forEach((btn) => btn.classList.remove("active"))
    document.getElementById(`${this.currentTool}-tool`).classList.add("active")
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  handleTouch(e, type) {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent(type === "start" ? "mousedown" : "mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    })
    this.canvas.dispatchEvent(mouseEvent)
  }

  startDrawing(e) {
    this.isDrawing = true
    const pos = this.getMousePos(e)
    this.lastX = pos.x
    this.lastY = pos.y
  }

  draw(e) {
    if (!this.isDrawing) return

    const pos = this.getMousePos(e)

    this.ctx.globalCompositeOperation = this.currentTool === "eraser" ? "destination-out" : "source-over"
    this.ctx.strokeStyle = this.currentColor
    this.ctx.lineWidth = this.currentSize

    this.ctx.beginPath()
    this.ctx.moveTo(this.lastX, this.lastY)
    this.ctx.lineTo(pos.x, pos.y)
    this.ctx.stroke()

    // Send drawing data to other users
    if (typeof socketManager !== "undefined") {
      socketManager.sendWhiteboardData({
        x0: this.lastX,
        y0: this.lastY,
        x1: pos.x,
        y1: pos.y,
        color: this.currentColor,
        size: this.currentSize,
        tool: this.currentTool,
      })
    }

    this.lastX = pos.x
    this.lastY = pos.y
  }

  stopDrawing() {
    this.isDrawing = false
  }

  handleRemoteDrawing(data) {
    this.ctx.globalCompositeOperation = data.tool === "eraser" ? "destination-out" : "source-over"
    this.ctx.strokeStyle = data.color
    this.ctx.lineWidth = data.size

    this.ctx.beginPath()
    this.ctx.moveTo(data.x0, data.y0)
    this.ctx.lineTo(data.x1, data.y1)
    this.ctx.stroke()
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
