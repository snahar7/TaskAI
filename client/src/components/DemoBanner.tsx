import { useAuth } from "@/hooks/useAuth";

/** Shown on every page in DEMO_MODE, and as a full-page notice when Firebase is required but missing. */
export function DemoBanner() {
  const { demoMode, configError } = useAuth();

  if (configError) {
    return (
      <div role="alert" data-testid="config-error" className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-3 text-sm">
        <strong>Setup needed:</strong> {configError}
      </div>
    );
  }
  if (!demoMode) return null;
  return (
    <div role="status" data-testid="demo-banner" className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm text-center">
      <strong>Demo mode</strong>: you're signed in as a local Demo User, and AI breakdowns are canned examples.
      Add your own Firebase and OpenAI keys to <code>.env</code> for the real thing (see README).
    </div>
  );
}
