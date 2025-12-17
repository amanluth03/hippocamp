import { NavLink, useLocation } from "react-router-dom";

interface NavItem {
  path: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const navItems: NavItem[] = [
  { path: "/", label: "Home", icon: "🏠", activeIcon: "🏠" },
  { path: "/events", label: "Events", icon: "📅", activeIcon: "📅" },
  { path: "/memories", label: "Memories", icon: "📸", activeIcon: "📸" },
  { path: "/flashbacks", label: "Flashbacks", icon: "✨", activeIcon: "✨" },
];

export function BottomNav() {
  const location = useLocation();

  // Don't show on certain pages
  const hiddenPaths = ["/auth/callback", "/dev/login", "/share-target"];
  const isEventDetail = location.pathname.startsWith("/events/") && location.pathname !== "/events";
  
  if (hiddenPaths.includes(location.pathname) || isEventDetail) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative ${
                isActive
                  ? "text-purple-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className={`text-xl mb-0.5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                {isActive ? item.activeIcon : item.icon}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? "text-purple-400" : "text-gray-500"}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-0.5 w-8 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

