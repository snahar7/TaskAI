import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useState, useEffect } from "react";

// Temporary stealth mode component - remove this after launch
function StealthMode({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem('taflo_stealth_auth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'taflo2025') {
      localStorage.setItem('taflo_stealth_auth', 'authenticated');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 0.5rem 0'
          }}>Taflo</h1>
          <p style={{
            color: '#6b7280',
            margin: '0 0 2rem 0',
            fontSize: '0.95rem'
          }}>Enter access code to continue</p>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access code"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '1rem',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Access App
            </button>
          </form>
          {error && (
            <div style={{
              color: '#ef4444',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>
              Invalid access code. Please try again.
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StealthMode>
    <App />
  </StealthMode>
);
