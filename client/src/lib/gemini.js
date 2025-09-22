import { GoogleGenAI } from "@google/genai";

const safetySettings = [
    {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_LOW_AND_ABOVE",
    },
    {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_LOW_AND_ABOVE",
    },
];

const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_PUBLIC_KEY });

async function SendPrompt(prompt) {

    const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
            safetySettings,
            thinkingConfig: {
                thinkingBudget: 0, // Disables thinking
            }
        },
        contents: [
            {
                part: "text",
                text: prompt,
            }
        ]
    });
    console.log(response.text)
    return response;
}

export default SendPrompt;