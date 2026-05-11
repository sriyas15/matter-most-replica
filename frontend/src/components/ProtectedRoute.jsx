import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a2a]">
        <div className="flex gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}