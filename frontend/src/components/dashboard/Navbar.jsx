import { FiBell, FiSearch } from "react-icons/fi";

export default function Navbar() {
    return (
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2 w-96">
                <FiSearch />
                <input
                    type="text"
                    placeholder="Search emails..."
                    className="bg-transparent outline-none w-full"
                />
            </div>

            <div className="flex items-center gap-5">
                <FiBell size={20} />

                <img
                    src="https://ui-avatars.com/api/?name=User"
                    alt="User"
                    className="w-10 h-10 rounded-full"
                />
            </div>
        </header>
    );
}