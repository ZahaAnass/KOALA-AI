
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-react"

function ChatList() {

    const { getToken } = useAuth()

    const { isPending, error, data } = useQuery({
        queryKey: ['userChats'],
        queryFn: async () => {
            const token = await getToken()

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/userchats`,
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

            return response.json()
        }
    })

    return (
        <div className="chatList flex flex-col h-full">
            <Link className="p-2.5 rounded-[10px] hover:bg-[#2c2937]" to="/dashboard">Create a new Chat</Link>
            <Link className="p-2.5 rounded-[10px] hover:bg-[#2c2937]" to="/">Explore KOALA AI </Link>
            <Link className="p-2.5 rounded-[10px] hover:bg-[#2c2937]" to="/">Contact </Link>
            <hr className="border-0 h-0.5 bg-[#ddd] opacity-10 rounded-[5px] my-5 mx-0"/>
            <div className="list flex flex-col overflow-scroll">
                <span className="title font-normal text-xs mb-2.5">RECENT CHATS</span>
                {isPending ? <p>Loading...</p> 
                    : error || data.length === 0 ? <p>No Chats Found</p> 
                    : data?.map((chat) => (
                        <Link key={chat._id} to={`/dashboard/chats/${chat._id}`} 
                            className="p-2.5 rounded-[10px] hover:bg-[#2c2937]">
                            {chat.title}
                        </Link>
                    ))}
            </div>
            <hr className="border-0 h-0.5 bg-[#ddd] opacity-10 rounded-[5px] my-5 mx-0"/>
            <div className="upgrade mt-auto flex items-center gap-2.5 text-xs">
                <img src="/logo.png" alt="logo" className="w-6 h-6"/>
                <div className="texts flex flex-col">
                    <span className="font-semibold">Upgrade to KOALA AI Pro</span>
                    <span className="font-semibold text-[#888]">Get unlimited access to all features</span>
                </div>
            </div>
        </div>
    )
}

export default ChatList;