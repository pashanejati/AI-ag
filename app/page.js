"use client";
import { useState, useRef, useEffect } from "react";
import { PRODUCTS } from "../lib/products";

const CONTEXT_OPTIONS = [
  { value: "home", label: "📍 کاربر در صفحه اصلی است" },
  { value: "p-gaming-1", label: "📍 کاربر در صفحه محصول «ROG Strix G16» است" },
  { value: "p-ultra-1", label: "📍 کاربر در صفحه محصول «UltraBook Air 14» است" },
];

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "سلام! من دستیار فروش TechLap هستم 👋 دنبال چه نوع لپ‌تاپی هستی؟" },
  ]);
  const [history, setHistory] = useState([]); // فرمت مورد نیاز سرور: [{role:'user'|'model', text}]
  const [input, setInput] = useState("");
  const [pageContext, setPageContext] = useState("home");
  const [loading, setLoading] = useState(false);
  const [cardsByMsg, setCardsByMsg] = useState({});
  const boxRef = useRef(null);

  useEffect(() => {
    boxRef.current?.scrollTo(0, boxRef.current.scrollHeight);
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, userText: text, pageContext }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((m) => [...m, { role: "assistant", text: "خطا: " + data.error }]);
      } else {
        setHistory(data.updatedHistory);
        setMessages((m) => {
          const next = [...m, { role: "assistant", text: data.reply }];
          if (data.productIds?.length) {
            setCardsByMsg((c) => ({ ...c, [next.length - 1]: data.productIds }));
          }
          return next;
        });
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "یه مشکل موقت پیش اومد، دوباره امتحان کن." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>TechLap — فروشگاه دمو</h2>
        <select value={pageContext} onChange={(e) => setPageContext(e.target.value)}>
          {CONTEXT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div
        ref={boxRef}
        style={{
          border: "1px solid #333",
          borderRadius: 14,
          height: "60vh",
          overflowY: "auto",
          padding: 14,
          background: "#12141b",
          color: "#eee",
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "inline-block",
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: 12,
                background: m.role === "user" ? "#1e232f" : "#2a2318",
                float: m.role === "user" ? "left" : "right",
                clear: "both",
              }}
            >
              {m.text}
            </div>
            {cardsByMsg[i] && (
              <div style={{ clear: "both", display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {cardsByMsg[i].map((id) => {
                  const p = PRODUCTS.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} style={{ background: "#1e232f", border: "1px solid #333", borderRadius: 10, padding: 10, width: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ color: "#e2a23b", fontSize: 13 }}>{p.price.toLocaleString("fa-IR")} تومان</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{p.specifications.cpu}<br />{p.specifications.gpu}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ color: "#999", fontSize: 12 }}>در حال بررسی...</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #333", background: "#1e232f", color: "#eee" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="سوالتو بپرس..."
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ padding: "0 20px", borderRadius: 10, border: "none", background: "#e2a23b", fontWeight: 700, cursor: "pointer" }}
        >
          ارسال
        </button>
      </div>
    </div>
  );
}
