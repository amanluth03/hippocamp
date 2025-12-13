import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Home } from "./pages/Home";
import { AuthCallback } from "./pages/AuthCallback";

function App() {
  const { user, loading, login, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home user={user} loading={loading} onLogout={logout} />}
        />
        <Route
          path="/auth/callback"
          element={<AuthCallback onLogin={login} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
