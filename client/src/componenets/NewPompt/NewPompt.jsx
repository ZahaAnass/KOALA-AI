import { useRef, useState } from "react";
import { useEffect } from "react";
import { Upload } from "../Upload/Upload";
import { IKImage } from "imagekitio-react";
import { config, genAI } from "../../lib/gemini";
import Markdown from "react-markdown";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowBigDown } from "lucide-react"
import { useOutletContext } from "react-router-dom";

function NewPompt({ data }) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData:{},
    aiData:{}
  })

  const { showScrollButton, setShowScrollButton } = useOutletContext();

  

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
      {img.dbData?.filePath && (
          <IKImage
            className="rounded-3xl max-w-[80%]"
            style={{alignSelf: "flex-end"}}
            urlEndpoint={import.meta.env.VITE_IMAGE_KIT_END_POINT}
            path={img.dbData?.filePath}
            height="300"
            width="400"
            transformation={[{ height: "300", width: "400" }]}
            loading="lazy"
            lqip={{ active: true , quality: 20}}
          />
      )}
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

      <div className="endChat pb-24 relative" ref={endRef}></div>

      {showScrollButton && <button
        className="flex items-center gap-2 fixed bottom-[15%] left-1/2 -translate-x-1/2 ml-5 bg-[#2c2937] rounded-full p-2 hover:bg-[#3b3846] transition-all duration-300 active:scale-80 active:bg-[#3b3846]"
        onClick={() => endRef.current.scrollIntoView({ behavior: "smooth" })}
      >
        <ArrowBigDown className="w-6 h-6" />
      </button>}

      <form
        onSubmit={handleSubmit}
        className="newForm w-full mx-auto -mt-26
                  bg-[#2c2937] rounded-2xl flex items-center gap-4 py-2 px-4 
                  border border-[#3b3846] shadow-md 
                  focus-within:border-[#7f7aff] transition-all bottom-0 z-20"
      >
        <Upload setImg={setImg} />

        <input
          id="file"
          type="file"
          multiple={false}
          hidden
        />

        <input
          type="text"
          name="text"
          placeholder="Ask anything..."
          autoComplete="off"
          className="flex-1 p-3 border-0 outline-0 bg-transparent text-[#ececec] 
                    placeholder:text-[#9b98a3] text-sm"
        />

        <button
          type="submit"
          className="rounded-xl bg-[#605e68] hover:bg-[#6d6b75] active:scale-95 
                    border-0 p-2.5 flex items-center justify-center cursor-pointer transition"
        >
          <img src="/arrow.png" alt="Send" className="w-4 h-4" />
        </button>
      </form>
    </>
  )
}

export default NewPompt