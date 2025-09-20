import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ChatList from "../../componenets/chatList/ChatList";

export const DashboardLayout = () => {

    const {userId, isLoaded} = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoaded && !userId) {
            navigate("/sign-in")
        }
    }, [isLoaded, userId, navigate]);

    if (!isLoaded) return "Loading ...";

    return (
        <div className="dashboardLayout flex gap-12 pt-5 h-full">
            <div className="menu flex-1">
                <ChatList />
            </div>
            <div className="content flex-4 bg-[#12101b]">
                <Outlet />
            </div>
        </div>
    )
}