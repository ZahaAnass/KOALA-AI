import NewPompt from "../../componenets/NewPompt/NewPompt";
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-react"
import "./ChatPage.css"
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imagekitio-react";

export const ChatPage = () => {

    const path = useLocation().pathname
    const chatId = path.split("/").pop()

    const { getToken } = useAuth()

    const { isPending, error, data } = useQuery({
        queryKey: ['chat', chatId],
        queryFn: async () => {
            const token = await getToken()

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chats/${chatId}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (!response.ok) {
                console.log(response)
            }

            return await response.json()
        }
    })

    return (
        <div className="chatPage h-full flex flex-col items-center relative">
            <div className="wrapper flex-1 w-full flex justify-center overflow-scroll">
                <div className="chat w-1/2 flex flex-col gap-5">
                    {/* <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div> */}

                {isPending ? <p>Loading...</p> : error ? <p>Somthing went wrong!</p> : data?.history?.map((message, index) => (
                    <>
                        {message.img && (
                            <IKImage
                                urlEndpoint={import.meta.env.VITE_IMAGE_KIT_END_POINT}
                                path={message.img}
                                height="300"
                                width="400"
                                transformation={[{ height: "300", width: "400" }]}
                                loading="lazy"
                                lqip={{ active: true , quality: 20}}
                            />
                        )}
                        <div key={index} className={`message ${message.role === 'user' ? 'user' : 'ai'}`}>
                            <Markdown>{message.parts[0].text}</Markdown>
                        </div>
                    </>
                ))}

                    {data && <NewPompt data={data}/>}
                </div>
            </div>
        </div>
    )
}