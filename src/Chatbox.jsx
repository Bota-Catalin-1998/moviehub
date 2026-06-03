import { useEffect, useRef, useState } from "react";

//const API_BASE_URL = "https://localhost:3000";
//const WS_URL = "wss://localhost:3000";

const API_BASE_URL = "https://172.20.10.4:3000";
const WS_URL = "wss://172.20.10.4:3000";

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem("token");

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`
  };
}

export default function ChatBox({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [chatError, setChatError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    fetchMessages();

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("Chat WebSocket connected");
      setChatError("");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "NEW_CHAT_MESSAGE") {
          setMessages((prev) => [...prev, payload.message]);
        }
      } catch (error) {
        console.error("Chat WS parse error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("Chat WebSocket error:", error);
      setChatError("Could not connect to chat.");
    };

    ws.onclose = () => {
      console.log("Chat WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages() {
    try {
      setChatError("");

      const response = await fetch(`${API_BASE_URL}/chat`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        setChatError(result.error || "Could not load chat messages.");
        return;
      }

      setMessages(result);
    } catch (error) {
      setChatError("Could not connect to chat.");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();

    if (!text.trim()) return;

    try {
      setChatError("");

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          senderEmail: currentUser.email,
          senderName: currentUser.name,
          text: text.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setChatError(result.error || "Could not send message.");
        return;
      }

      setText("");
    } catch (error) {
      setChatError("Could not connect to chat.");
    }
  }

  return (
    <section className="card">
      <div className="section-header">
        <h2>Real-Time Chat</h2>
      </div>

      <div
        style={{
          height: "300px",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "12px",
          marginBottom: "12px",
          background: "#fafafa"
        }}
      >
        {messages.length > 0 ? (
          messages.map((message) => {
            const isOwnMessage = message.senderEmail === currentUser.email;

            return (
              <div
                key={message._id}
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: isOwnMessage ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background: isOwnMessage ? "#dbeafe" : "#e5e7eb"
                  }}
                >
                  <p style={{ margin: 0, fontWeight: "bold" }}>
                    {message.senderName}
                  </p>
                  <p style={{ margin: "4px 0" }}>{message.text}</p>
                  <small style={{ color: "#555" }}>
                    {new Date(message.createdAt).toLocaleString()}
                  </small>
                </div>
              </div>
            );
          })
        ) : (
          <p>No messages yet.</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {chatError && (
        <p style={{ color: "red", marginBottom: "10px" }}>{chatError}</p>
      )}

      <form onSubmit={handleSendMessage} className="form">
        <label>
          Message
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
          />
        </label>

        <button type="submit" className="primary-btn full-btn">
          Send message
        </button>
      </form>
    </section>
  );
}