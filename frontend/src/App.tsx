import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Home } from "./pages/Home";
import { AuthCallback } from "./pages/AuthCallback";
import { Events } from "./pages/Events";
import { EventDetail } from "./pages/EventDetail";

function App() {
  const { user, loading, token, login, logout } = useAuth();

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
        <Route
          path="/events"
          element={<Events token={token} />}
        />
        <Route
          path="/events/:eventId"
          element={<EventDetail token={token} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
