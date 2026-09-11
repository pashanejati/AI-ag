import { NextResponse } from "next/server";
import { buildSystemPrompt } from "../../../lib/systemPrompt";
import { runTool } from "../../../lib/tools";

const GEMINI_MODEL = "gemini-2.0-flash"; // در صورت نیاز بعداً می‌توان مدل را عوض کرد
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function extractJSON(raw) {
  if (!raw) return null;
  let t = raw.trim();
  t = t.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

async function callGemini(systemPrompt, contents) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY تنظیم نشده است. آن را در تنظیمات محیطی (Environment Variables) سرویس هاست وارد کن.");
  }
  const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });
  const data = await resp.json();
  if (data.error) {
    throw new Error("خطای Gemini API: " + data.error.message);
  }
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
  return text;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const history = Array.isArray(body.history) ? body.history : []; // [{role:'user'|'model', text}]
    const userText = body.userText || "";
    const pageContext = body.pageContext || "home";

    if (!userText.trim()) {
      return NextResponse.json({ error: "پیام خالی است." }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(pageContext);

    // contents برای این نوبت: تاریخچه‌ی قابل‌نمایش + پیام جدید کاربر
    let contents = history.map((h) => ({ role: h.role, parts: [{ text: h.text }] }));
    contents.push({ role: "user", parts: [{ text: userText }] });

    let idsToShow = [];
    let finalMessage = "";
    let safety = 0;

    while (safety < 6) {
      safety++;
      const raw = await callGemini(systemPrompt, contents);
      const parsed = extractJSON(raw);

      if (!parsed) {
        finalMessage = raw || "متوجه نشدم، می‌شه دوباره بگی؟";
        break;
      }

      if (parsed.tool_call && parsed.tool_call.name) {
        const { result, ids } = runTool(parsed.tool_call.name, parsed.tool_call.input);
        idsToShow = idsToShow.concat(ids || []);
        // این تبادل فقط برای همین نوبت لازم است، به تاریخچه‌ی قابل‌نمایش اضافه نمی‌شود
        contents.push({ role: "model", parts: [{ text: raw }] });
        contents.push({
          role: "user",
          parts: [{ text: "نتیجه ابزار (" + parsed.tool_call.name + "): " + JSON.stringify(result) }],
        });
        if (parsed.message) finalMessage = parsed.message;
        continue;
      } else {
        finalMessage = parsed.message || "";
        break;
      }
    }

    const updatedHistory = [
      ...history,
      { role: "user", text: userText },
      { role: "model", text: finalMessage },
    ];

    return NextResponse.json({
      reply: finalMessage,
      productIds: [...new Set(idsToShow)],
      updatedHistory,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "خطای داخلی سرور" }, { status: 500 });
  }
}
