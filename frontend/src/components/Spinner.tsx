interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`${sizes[size]} ${className} animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500`}
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-gray-400 text-lg">{message}</p>
    </div>
  );
}

