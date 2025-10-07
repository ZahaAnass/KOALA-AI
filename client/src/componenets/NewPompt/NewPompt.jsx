import { useRef, useState } from "react";
import { useEffect } from "react";
import { Upload } from "../Upload/Upload";
import { IKImage } from "imagekitio-react";
import { config, genAI } from "../../lib/gemini";
import Markdown from "react-markdown";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function NewPompt({ data }) {
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

  // ! REMOVE THIS IN PRODUCTION 
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (data?.history?.length == 1) {
      newPrompt(data?.history[0]?.parts[0]?.text, true)
    }
  }, [])

  useEffect(() => {
      endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data, answer, question, img.dbData])

  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  const mutation = useMutation({
      mutationFn: async () => {
          const token = await getToken();
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
              method: "PUT",
              credentials: "include",
              headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ 
                question: question.length ? question : undefined,
                answer,
                img: img.dbData?.filePath || undefined
              })
          })

          if (!response.ok) {
              const errorText = await response.text()
              console.log('Error response: ', errorText)
              return
          }

          const responseData = await response.json()
          return responseData
      },
      onSuccess: () => {
          queryClient
            .invalidateQueries({ queryKey: ['chat', data._id] })
            .then(() => {
              setQuestion("")
              setAnswer("")
              setImg({
                isLoading: false,
                error: "",
                dbData:{},
                aiData:{}
              })
            })
      },
      onError: (err) => {
        console.log(err)
      }
  })

  const newPrompt = async (prompt, isInitial) => {
    if (!isInitial) setQuestion(prompt)

    try {

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

      const response = await chat.sendMessageStream({
        message: contents,
        config: config,
        maxOutputTokens: 100,
      })
  
      let accumulatedText = "";
      for await (const chunk of response) {
        accumulatedText += chunk.text;
        setAnswer(accumulatedText)
      }

      setTimeout(() => mutation.mutate(), 2000)

    } catch (error) {
      console.log(error)
    }


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
      await newPrompt(text, false);
      e.target.text.value = "";
    }catch(err){
      setImg({
        isLoading: false,
        error: "Something went wrong"
      })
      console.log(err)
    }finally{
      setImg({
        ...img,
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