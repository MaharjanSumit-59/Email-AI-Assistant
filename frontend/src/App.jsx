import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Inbox from "./pages/emails/Inbox";
import EmailDetails from "./pages/emails/EmailDetails";
import Reminders from "./pages/reminders/Reminders";
import Profile from "./pages/profile/Profile";
import Settings from "./pages/settings/Settings";
import Assistant from "./pages/ai/Assistant";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/inbox" element={<Inbox />} />

                <Route path="/email/:id" element={<EmailDetails />} />

                <Route path="/reminders" element={<Reminders />} />

                <Route path="/profile" element={<Profile />} />

                <Route path="/settings" element={<Settings />} />
                <Route path="/ai" element={<Assistant />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;