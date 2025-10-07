import { useAuth } from "@clerk/clerk-react";
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom";

export const DashboardPage = () => {

    const { getToken } = useAuth();

    const queryClient = useQueryClient();

    const navigate = useNavigate()

    const mutation = useMutation({
        mutationFn: async (text) => {
            const token = await getToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
                method: "POST",
                credentials: "include",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ text })
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.log('Error response: ', errorText)
                return
            }

            const data = await response.json()
            return data
        },
        onSuccess: ({chatId}) => {
            queryClient.invalidateQueries({ queryKey: ['userChats'] })
            navigate(`/dashboard/chats/${chatId}`)
        }
    })

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = e.target.text.value;
        if(!text) return;

        mutation.mutate(text)
    }

    return (
        <div className="dashboardPage h-full flex flex-col items-center">
            <div className="texts flex-1 flex flex-col items-center justify-center w-1/2">
                <div className="logo flex items-center gap-5 opacity-20">
                    <img src="/logo.png" alt="logo" className="w-16 h-16"/>
                    <h1 className="text-6xl bg-gradient-to-r from-[#217bfe] to-[#e55571] bg-clip-text text-transparent">KOALA AI</h1>
                </div>
                <div className="options w-full flex items-center justify-between gap-12">
                    <div className="option flex flex-col flex-1 gap-2.5 font-light text-sm p-5 border-2 border-solid border-[#555] rounded-[20px]">
                        <img className="w-10 h-10 object-cover" src="/chat.png" alt="chat" />
                        <span>Create a New Chat</span>
                    </div>
                    <div className="option flex flex-col flex-1 gap-2.5 font-light text-sm p-5 border-2 border-solid border-[#555] rounded-[20px]">
                        <img className="w-10 h-10 object-cover" src="/image.png" alt="image" />
                        <span>Analyze Images</span>
                    </div>
                    <div className="option flex flex-col flex-1 gap-2.5 font-light text-sm p-5 border-2 border-solid border-[#555] rounded-[20px]">
                        <img className="w-10 h-10 object-cover" src="/code.png" alt="contact" />
                        <span>Help me with my Code</span>
                    </div>
                </div>
            </div>
            <div className="formContainer mt-auto w-1/2 bg-[#2c2937] rounded-[20px] flex">
                <form onSubmit={handleSubmit} className="w-full h-full flex items-center justify-between gap-5 mb-2.5">
                    <input name="text" type="text" placeholder="Ask me anything..." className="flex-1 p-5 bg-transparent border-0 outline-none text-[#ececec]"/>
                    <button className="bg-[#605e68] rounded-[50%] border-0 cursor-pointer p-2.5 flex items-center justify-center mr-5">
                        <img src="/arrow.png" alt="arrow" className="w-4 h-4 "/>
                    </button>
                </form>
            </div>
        </div>
    )
}