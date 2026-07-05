import { NavLink } from "react-router-dom";
import {
    FiHome,
    FiInbox,
    FiClock,
    FiUser,
    FiSettings,
    FiCpu,
    FiLogOut,
} from "react-icons/fi";

import useAuth from "../../hooks/useAuth";

const links = [
    { name: "Dashboard", path: "/dashboard", icon: <FiHome size={18} /> },
    { name: "Inbox", path: "/inbox", icon: <FiInbox size={18} /> },
    { name: "Assistant", path: "/ai", icon: <FiCpu size={18} /> },
    { name: "Reminders", path: "/reminders", icon: <FiClock size={18} /> },
    { name: "Profile", path: "/profile", icon: <FiUser size={18} /> },
    { name: "Settings", path: "/settings", icon: <FiSettings size={18} /> },
];

export default function Sidebar() {
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        window.location.href = "/";
    };

    return (
        <aside className="w-60 shrink-0 bg-paper-raised border-r border-line min-h-screen flex flex-col">
            <div className="px-6 pt-7 pb-6">
                <span className="font-display text-xl tracking-tight">
                    Signal
                </span>
            </div>

            <nav className="flex-1 flex flex-col gap-1 px-3">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                            `relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-signal-dim text-signal"
                                    : "text-muted hover:bg-paper hover:text-ink"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-opacity ${
                                        isActive
                                            ? "bg-signal opacity-100"
                                            : "opacity-0"
                                    }`}
                                />
                                {link.icon}
                                {link.name}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-3 border-t border-line">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-muted hover:bg-paper hover:text-ember transition-colors"
                >
                    <FiLogOut size={18} />
                    Log out
                </button>
            </div>
        </aside>
    );
}
