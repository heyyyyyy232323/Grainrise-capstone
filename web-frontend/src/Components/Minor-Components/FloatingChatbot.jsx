import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronDown } from "lucide-react";
import Logo from "../../assets/Logo.png";

const INITIAL_MESSAGES = [
  {
    id: 1,
    from: "bot",
    text: "👋 Hello! I am the GrainRise Assistant. How can I help you today?",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

const QUICK_REPLIES = ["How do I register?", "Track my order", "Contact support"];

export default function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setShowTooltip(false);
    }
  }, [open]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = {
      id: Date.now(),
      from: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const botReplies = {
        "how do i register?": "You can register by clicking the Register button on the landing page or login page. Choose between Retailer or Farmer to get started!",
        "track my order": "To track your order, log in to your account and navigate to the Orders section in your dashboard.",
        "contact support": "You can reach our support team at support@grainrise.com or call us at +63 900 000 0000.",
      };
      const reply = botReplies[text.toLowerCase()] || "Thanks for reaching out! Our team will get back to you shortly. For urgent concerns, email us at support@grainrise.com.";
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now() + 1, from: "bot", text: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999 }}>
      {/* Chat window */}
      <div style={{ position: "absolute", bottom: 72, right: 0, width: 340, borderRadius: 20, background: "#fff", boxShadow: "0 12px 48px rgba(30,90,40,0.18), 0 2px 8px rgba(0,0,0,0.10)", overflow: "hidden", display: "flex", flexDirection: "column", transformOrigin: "bottom right", transform: open ? "scale(1)" : "scale(0.85)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "transform 0.22s cubic-bezier(.34,1.56,.64,1), opacity 0.18s ease" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #2d6a35 0%, #4a9e56 100%)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            <img src={Logo} alt="GrainRise" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>GrainRise Assistant</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7dfa90", display: "inline-block", boxShadow: "0 0 6px #7dfa90" }} />
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 11 }}>Online</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><ChevronDown size={17} /></button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, background: "#f6faf6" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", flexDirection: msg.from === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 8 }}>
              {msg.from === "bot" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#2d6a35,#4a9e56)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  <img src={Logo} alt="" style={{ width: 18, objectFit: "contain" }} />
                </div>
              )}
              <div style={{ maxWidth: "75%" }}>
                <div style={{ background: msg.from === "user" ? "linear-gradient(135deg,#2d6a35,#4a9e56)" : "#fff", color: msg.from === "user" ? "#fff" : "#1a2e1a", padding: "9px 13px", borderRadius: msg.from === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: 13, lineHeight: 1.5, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>{msg.text}</div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 3, textAlign: msg.from === "user" ? "right" : "left", paddingLeft: msg.from === "bot" ? 4 : 0, paddingRight: msg.from === "user" ? 4 : 0 }}>{msg.time}</div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#2d6a35,#4a9e56)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                <img src={Logo} alt="" style={{ width: 18, objectFit: "contain" }} />
              </div>
              <div style={{ background: "#fff", borderRadius: "18px 18px 18px 4px", padding: "10px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (<span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#4a9e56", display: "inline-block", animation: "chatbotDot 1.2s infinite", animationDelay: `${i * 0.2}s` }} />))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div style={{ padding: "8px 14px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid #e8f4e8", background: "#f6faf6" }}>
          {QUICK_REPLIES.map((q) => (
            <button key={q} onClick={() => sendMessage(q)} style={{ background: "#fff", border: "1.5px solid #2d6a35", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#2d6a35", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#2d6a35"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#2d6a35"; }}>
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: "1px solid #e8f4e8", background: "#fff" }}>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." style={{ flex: 1, border: "1.5px solid #d4ead4", borderRadius: 20, padding: "8px 14px", fontSize: 13, outline: "none", background: "#f6faf6", color: "#1a2e1a" }}
            onFocus={(e) => (e.target.style.borderColor = "#2d6a35")} onBlur={(e) => (e.target.style.borderColor = "#d4ead4")} />
          <button onClick={() => sendMessage(input)} disabled={!input.trim()} style={{ width: 36, height: 36, borderRadius: "50%", background: input.trim() ? "linear-gradient(135deg,#2d6a35,#4a9e56)" : "#d4ead4", border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0, transition: "background 0.2s" }}>
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Tooltip */}
      {!open && showTooltip && (
        <div style={{ position: "absolute", bottom: 66, right: 4, background: "#fff", borderRadius: 12, padding: "8px 14px", fontSize: 13, color: "#333", fontWeight: 600, boxShadow: "0 4px 18px rgba(30,90,40,0.15)", whiteSpace: "nowrap", animation: "chatbotFadeIn 0.3s ease", pointerEvents: "none" }}>
          How can I help you?
          <span style={{ position: "absolute", bottom: -6, right: 20, width: 12, height: 12, background: "#fff", transform: "rotate(45deg)", boxShadow: "2px 2px 4px rgba(0,0,0,0.06)", zIndex: -1 }} />
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setOpen((o) => !o)} aria-label="Open chat"
        style={{ width: 56, height: 56, borderRadius: "50%", background: "#105423", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(16,84,35,0.40), 0 2px 6px rgba(0,0,0,0.12)", transition: "transform 0.18s cubic-bezier(.34,1.56,.64,1)", color: "#fff" }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.10)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
        {open ? <X size={26} /> : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.477 2 2 6.03 2 11C2 13.568 3.23 15.88 5.163 17.513C4.811 18.966 3.65 20.306 3.535 20.44C3.42 20.573 3.393 20.755 3.46 20.91C3.528 21.066 3.678 21.164 3.843 21.164C6.398 21.164 8.27 19.98 9.387 19.222C10.22 19.467 11.096 19.6 12 19.6C17.523 19.6 22 15.57 22 11C22 6.03 17.523 2 12 2Z" fill="white"/>
            <circle cx="8.5" cy="11" r="1.5" fill="#105423"/>
            <circle cx="15.5" cy="11" r="1.5" fill="#105423"/>
          </svg>
        )}
      </button>

      <style>{`
        @keyframes chatbotDot { 0%,80%,100%{transform:scale(0.7);opacity:0.5} 40%{transform:scale(1);opacity:1} }
        @keyframes chatbotFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
