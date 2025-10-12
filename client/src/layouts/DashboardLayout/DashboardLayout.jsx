import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ChatList from "../../componenets/chatList/ChatList";
import { MedalIcon, BotIcon } from "lucide-react";

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
            <div className={`menu ${isOpen ? "flex-1" : "flex-0"}`}>
                <div className={`flex flex-row ${isOpen ? "w-full" : "w-0"}`}>
                    {isOpen && <ChatList />}
                    <button onClick={() => setIsOpen(!isOpen)} className="menuButton flex mt-3">
                        {isOpen ? <BotIcon className="w-6 h-6" /> : <MedalIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
            <div className="content flex-4 bg-[#12101b]">
                <Outlet />
            </div>
        </div>
    )
}