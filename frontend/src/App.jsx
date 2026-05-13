import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ChatProvider } from "./context/ChatContext";
import { DMProvider } from "./context/DMContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ChatPage from "./pages/ChatPage";
import InvitePage from "./pages/InvitePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <ChatProvider>
            <DMProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/invite/:inviteToken" element={<InvitePage />} />
                  <Route path="/" element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }/>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </NotificationProvider>
            </DMProvider>
          </ChatProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}