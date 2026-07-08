import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/auth/Landing";
import Dashboard from "./pages/dashboard/Dashboard";
import Inbox from "./pages/emails/Inbox";
import Trash from "./pages/emails/Trash";
import EmailDetails from "./pages/emails/EmailDetails";
import Reminders from "./pages/reminders/Reminders";
import Profile from "./pages/profile/Profile";
import Settings from "./pages/settings/Settings";
import Assistant from "./pages/ai/Assistant";
import AutomationLog from "./pages/ai/AutomationLog";
import ProtectedRoute from "./routes/ProtectedRoute";
import AuthSuccess from "./pages/auth/AuthSuccess";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />

                <Route path="/email/:id" element={<ProtectedRoute><EmailDetails /></ProtectedRoute>} />

                <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />

                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />

                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/ai" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />

                <Route path="/ai/log" element={<ProtectedRoute><AutomationLog /></ProtectedRoute>} />
                <Route path="/auth/success" element={<AuthSuccess />}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;