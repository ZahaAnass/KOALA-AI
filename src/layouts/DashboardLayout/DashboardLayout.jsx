import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
    return (
        <div className="dashboardLayout">
            <div className="menu">MENU</div>
            <div className="content">
                <Outlet />
            </div>
        </div>
    )
}