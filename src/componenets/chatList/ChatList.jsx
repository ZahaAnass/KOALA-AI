
import { Link } from "react-router-dom"

function ChatList() {
    return (
        <div className="chatList flex flex-col h-full">
            <span className="title font-normal text-xs mb-2.5">RECENT CHATS</span>
            <Link to="/dashboard">Create a new Chat</Link>
            <Link to="/">Explore KOALA AI </Link>
            <Link to="/">Contact </Link>
            <hr className="border-0 h-0.5 bg-[#ddd] opacity-10 rounded-[5px] my-5 mx-0"/>
            <div className="list flex flex-col overflow-scroll">
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
                <Link to="/" className="p-2.5 rounded-[10px] hover:bg-[#2c2937]"> My Chat Title</Link>
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