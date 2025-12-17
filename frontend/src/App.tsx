import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Home } from "./pages/Home";
import { AuthCallback } from "./pages/AuthCallback";
import { Events } from "./pages/Events";
import { EventDetail } from "./pages/EventDetail";
import { Flashbacks } from "./pages/Flashbacks";
import { Memories } from "./pages/Memories";
import { DevLogin } from "./pages/DevLogin";
import { ShareTarget } from "./pages/ShareTarget";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  const { user, loading, token, login, logout } = useAuth();

  return (
    <ErrorBoundary>
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
          <Route
            path="/flashbacks"
            element={<Flashbacks token={token} />}
          />
          <Route
            path="/memories"
            element={<Memories token={token} />}
          />
          <Route
            path="/dev/login"
            element={<DevLogin onLogin={login} />}
          />
          <Route
            path="/share-target"
            element={<ShareTarget token={token} />}
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
