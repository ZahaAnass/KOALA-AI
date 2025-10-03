import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_PUBLIC_KEY });

async function SendPrompt({ image = null, prompt = "" }) {
  const response = await ai.models.generateContentStream({
    model: "gemini-1.5-flash",
    contents: "Explain how AI works",
    safetySettings: [
        {
            maxtoken: 100
        }
    ]
  });

  let text = ""
  for await (const chunk of response) {
    text += chunk.text;
    console.log(chunk.text);
  }

  console.log(text.text);
  return text;
}

export {
  SendPrompt,
  ai
}


