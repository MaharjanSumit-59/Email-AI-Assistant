import { NavLink } from "react-router-dom";
import {
    FiHome,
    FiInbox,
    FiTrash2,
    FiClock,
    FiUser,
    FiSettings,
    FiCpu,
    FiActivity,
    FiLogOut,
    FiX,
} from "react-icons/fi";

import useAuth from "../../hooks/useAuth";

const links = [
    { name: "Dashboard", path: "/dashboard", icon: <FiHome size={18} /> },
    { name: "Inbox", path: "/inbox", icon: <FiInbox size={18} /> },
    { name: "Assistant", path: "/ai", icon: <FiCpu size={18} />, end: true },
    { name: "Automation log", path: "/ai/log", icon: <FiActivity size={18} /> },
    { name: "Reminders", path: "/reminders", icon: <FiClock size={18} /> },
    { name: "Profile", path: "/profile", icon: <FiUser size={18} /> },
    { name: "Trash", path: "/trash", icon: <FiTrash2 size={18} /> },
    { name: "Settings", path: "/settings", icon: <FiSettings size={18} /> },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        window.location.href = "/";
    };

    return (
        <>
            {/* Mobile backdrop — click outside the drawer to close it */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 bg-ink/40 z-30 md:hidden"
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-paper-raised border-r border-line flex flex-col transform transition-transform duration-200 ease-in-out
                    md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex items-center justify-between px-6 pt-7 pb-6">
                    <span className="font-display text-xl tracking-tight">
                        Signal
                    </span>

                    <button
                        onClick={onClose}
                        aria-label="Close menu"
                        className="text-faint hover:text-ink md:hidden"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
                    {links.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            end={link.end}
                            onClick={onClose}
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
        </>
    );
}