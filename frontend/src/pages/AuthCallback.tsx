import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface AuthCallbackProps {
  onLogin: (token: string) => void;
}

export function AuthCallback({ onLogin }: AuthCallbackProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      onLogin(token);
      navigate("/", { replace: true });
    } else {
      // No token, redirect to home
      navigate("/", { replace: true });
    }
  }, [searchParams, onLogin, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">Signing you in...</div>
    </div>
  );
}

