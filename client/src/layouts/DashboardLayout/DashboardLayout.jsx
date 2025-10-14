import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ChatList from "../../componenets/chatList/ChatList";
import { X, TextAlignJustify } from "lucide-react";

export const DashboardLayout = () => {

    const {userId, isLoaded} = useAuth();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isLoaded && !userId) {
            navigate("/sign-in")
        }
    }, [isLoaded, userId, navigate]);

    if (!isLoaded) return "Loading ...";

    return (
        <div className="dashboardLayout flex gap-12 pt-5 h-full relative">
            <div className={`menu ${isOpen ? "max-w-[250px]" : "w-0"} transition-all duration-500 ease-in-out`}>
                <div className={`flex flex-row ${isOpen ? "w-full" : "w-0"}`}>
                    {isOpen && <ChatList />}
                    <button onClick={() => setIsOpen(!isOpen)} className="menuButton flex h-11 hover:bg-gray-800 rounded-[10px] p-2">
                        {isOpen ? <X className=" w-6 h-6" /> : <TextAlignJustify className="w-6 h-6" />}
                    </button>
                </div>
            </div>
            <div className="content flex-4 bg-[#12101b] overflow-y-auto">
                <Outlet />
            </div>
        </div>
    )
}