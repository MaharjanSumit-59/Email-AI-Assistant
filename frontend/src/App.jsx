import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Inbox from "./pages/emails/Inbox";
import EmailDetails from "./pages/emails/EmailDetails";
import Reminders from "./pages/reminders/Reminders";
import Profile from "./pages/profile/Profile";
import Settings from "./pages/settings/Settings";
import Assistant from "./pages/ai/Assistant";
import ProtectedRoute from "./routes/ProtectedRoute";
import AuthSuccess from "./pages/auth/AuthSuccess";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />

                <Route path="/email/:id" element={<ProtectedRoute><EmailDetails /></ProtectedRoute>} />

                <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />

                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/ai" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
                <Route path="/auth/success" element={<AuthSuccess />}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;