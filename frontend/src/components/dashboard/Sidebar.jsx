import { NavLink } from "react-router-dom";
import {
    FiHome,
    FiInbox,
    FiClock,
    FiUser,
    FiSettings,
    FiCpu,
} from "react-icons/fi";

import useAuth from "../../hooks/useAuth";


const links = [
    {
        name: "Dashboard",
        path: "/dashboard",
        icon: <FiHome />,
    },
    {
        name: "Inbox",
        path: "/inbox",
        icon: <FiInbox />,
    },
    {
        name: "AI Assistant",
        path: "/ai",
        icon: <FiCpu />,
    },
    {
        name: "Reminders",
        path: "/reminders",
        icon: <FiClock />,
    },
    {
        name: "Profile",
        path: "/profile",
        icon: <FiUser />,
    },
    {
        name: "Settings",
        path: "/settings",
        icon: <FiSettings />,
    },
];

export default function Sidebar() {
    const { logout } = useAuth();
    const handleLogout = () => {

    logout();

    window.location.href = "/";

};
    return (
        <aside className="w-64 bg-white border-r min-h-screen">
            <div className="p-6 text-2xl font-bold text-blue-600">
                Email AI
            </div>

            <nav className="flex flex-col gap-2 p-4">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                isActive
                                    ? "bg-blue-600 text-white"
                                    : "hover:bg-gray-100"
                            }`
                        }
                    >
                        {link.icon}
                        {link.name}
                    </NavLink>
                ))}
            </nav>
            <button
            onClick={handleLogout}
            className="mx-4 mb-6 bg-red-500 text-white rounded-lg py-2 hover:bg-red-600"
            >
            Logout
        </button>
        </aside>
    );
}