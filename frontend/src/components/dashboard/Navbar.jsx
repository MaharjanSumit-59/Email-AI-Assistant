import useAuth from "../../hooks/useAuth";

function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default function Navbar() {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-paper-raised border-b border-line flex items-center justify-between px-8 shrink-0">
            <p className="text-sm text-muted">
                {greeting()}
                {user?.first_name ? `, ${user.first_name}` : ""}.
            </p>

            <div className="flex items-center gap-3">
                <div className="text-right leading-tight">
                    <p className="text-sm font-medium">
                        {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-muted">{user?.email}</p>
                </div>

                <img
                    src={
                        user?.profile_picture ||
                        "https://ui-avatars.com/api/?name=" +
                            encodeURIComponent(user?.first_name || "U")
                    }
                    alt=""
                    className="w-9 h-9 rounded-full border border-line"
                />
            </div>
        </header>
    );
}
