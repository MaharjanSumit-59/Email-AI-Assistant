import Sidebar from "../components/dashboard/Sidebar";
import Navbar from "../components/dashboard/Navbar";

export default function DashboardLayout({ children }) {
    return (
        <div className="flex h-screen">
            <Sidebar />

            <div className="flex-1 flex flex-col">
                <Navbar />

                <main className="flex-1 overflow-auto p-6 bg-gray-100">
                    {children}
                </main>
            </div>
        </div>
    );
}