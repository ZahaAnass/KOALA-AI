import { useRef, useState } from "react";
import { useEffect } from "react";
import { Upload } from "../Upload/Upload";
import { IKImage } from "imagekitio-react";
import { config, genAI } from "../../lib/gemini";
import Markdown from "react-markdown";

function NewPompt() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData:{},
    aiData:{}
  })

  const endRef = useRef(null);

  const chat = genAI.chats.create({
    model: "gemini-2.5-flash",
    history: [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{ text: "Great to meet you. What would you like to know?" }],
      },
    ],
  });

  useEffect(() => {
      endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [answer, question, img.dbData])

  const newPrompt = async (prompt) => {
    setQuestion(prompt)
  
    let contents = [];

    if(img.aiData && Object.keys(img.aiData).length > 0){
        contents.push({ 
          inlineData: img.aiData.inlineData
        })
    }

    if(prompt && prompt.trim()){
        contents.push({ 
            text: prompt 
        })
    }

    // console.log("Sending Content", contents)

    const response = await chat.sendMessageStream({
      message: contents,
      config: config,
      maxOutputTokens: 100,
    })

    let accumulatedText = "";
    for await (const chunk of response) {
      console.log(chunk.text);
      console.log("_".repeat(80));
      accumulatedText += chunk.text;
      setAnswer(accumulatedText)
    }
    
    setImg({
      isLoading: false,
      error: "",
      dbData:{},
      aiData:{}
    })

  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const text = e.target.text.value;
    if(!text) return;

    // Clear previous error
    setImg({
      isLoading: true,
      error: ""
    })

    setAnswer("")

    try{
      await newPrompt(text);
      e.target.text.value = "";
    }catch(err){
      setImg({
        isLoading: false,
        error: "Something went wrong"
      })
      console.log(err)
    }finally{
      setImg({
        isLoading: false,
      })
    }

  }

  return (
    <>
      {question && (
        <div className="message user">
          <p>{question}</p>
        </div>
      )}
      {answer && (
        <div className="message">
          <Markdown>{answer}</Markdown>
        </div>
      )}
      {/* ADD NEW CHAT */}
      {img.isLoading && (
        <div className="">Loading...</div>
      )}
      {img.dbData?.filePath && (
        <IKImage
          urlEndpoint={import.meta.env.VITE_IMAGE_KIT_END_POINT}
          path={img.dbData?.filePath}
          width={380}
          quality={100}
        />
      )}

      <div className="endChat pb-24" ref={endRef}></div>
      <form onSubmit={handleSubmit} className="newForm w-1/2 absolute bottom-0 bg-[#2c2937] rounded-[20px] flex items-center gap-5 py-0 px-5">
        <Upload setImg={setImg}/>
        <input id="file" type="file" multiple={false} hidden className="flex-1 p-5 border-0 outline-0 bg-transparent text-[#ececec]"/>
        <input type="text" name="text" placeholder="Ask anything" className="flex-1 p-5 border-0 outline-0 bg-transparent text-[#ececec]"/>
        <button className="rounded-[20px] bg-[#605e68] border-0 p-2.5 flex items-center justify-center cursor-pointer">
          <img src="/arrow.png" alt="" className="w-4 h-4"/>
        </button>
      </form>
    </>
  )
}

export default NewPompt