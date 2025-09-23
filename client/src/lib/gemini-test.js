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

async function SendPrompt({ image = null, prompt = "" }) {

    let contents = [];

    if(image){
        contents.push({ 
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            }
        })
    }

    if(prompt && prompt.trim()){
        contents.push({ 
            text: prompt 
        })
    }

    // console.log("Sending Content", contents)

    const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        config: {
            safetySettings,
            thinkingConfig: {
                thinkingBudget: 0, // Disables thinking
            }
        },
        contents: contents
    });
    // console.log("Response", response.text)
    return response;
}

export default SendPrompt;