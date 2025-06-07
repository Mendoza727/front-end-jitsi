"use client"

import { useState, useEffect, useRef } from "react"
import { getSocket } from "@/lib/socket"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Send } from "lucide-react"

export function ChatRoom() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [username, setUsername] = useState("User" + Math.floor(Math.random() * 1000))
  const messagesEndRef = useRef(null)
  const socket = getSocket()

  useEffect(() => {
    const handleNewMessage = (message) => {
      setMessages((prevMessages) => [...prevMessages, message])
    }

    socket.on("chat message", handleNewMessage)

    return () => {
      socket.off("chat message", handleNewMessage)
    }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    if (input.trim()) {
      const message = {
        id: Date.now().toString(),
        user: username,
        text: input.trim(),
      }
      socket.emit("chat message", message)
      setInput("")
    }
  }

  return (
    <Card className="flex flex-col h-[400px] w-full max-w-md">
      <CardHeader>
        <CardTitle>Chat Room</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <div className="font-bold text-sm">{msg.user}:</div>
            <div className="text-sm">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={sendMessage} className="flex w-full gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
            aria-label="Type your message"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
