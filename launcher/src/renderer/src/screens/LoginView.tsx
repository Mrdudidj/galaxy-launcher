import { useEffect, useState } from "react";
import { GalaxyLogo } from "../components/brand/GalaxyLogo";
import { useAuthStore } from "../state/authStore";
import "./LoginView.css";

export function LoginView(): React.JSX.Element {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginDev = useAuthStore((s) => s.loginDev);
  const loginReal = useAuthStore((s) => s.loginReal);

  useEffect(() => {
    void window.galaxy.auth.isConfigured().then(setIsConfigured);
  }, []);

  async function handleMsLogin(): Promise<void> {
    setIsSigningIn(true);
    setError(null);
    try {
      await loginReal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <div className="login-view">
      <div className="login-view__panel">
        <div className="login-view__brand">
          <GalaxyLogo size={40} />
        </div>
        <h1 className="login-view__title">Galaxy Launcher</h1>
        <p className="login-view__subtitle">Melde dich mit deinem Microsoft-Konto an, um zu spielen.</p>

        <button
          className="login-view__ms-button"
          onClick={() => void handleMsLogin()}
          disabled={isConfigured === false || isSigningIn}
        >
          <span className="login-view__ms-logo" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          {isSigningIn ? "Öffne Browser…" : "Mit Microsoft anmelden"}
        </button>

        {isConfigured === false && (
          <div className="login-view__notice">
            Die Microsoft-Anmeldung ist noch nicht eingerichtet — dafür braucht es erst eine Azure-App-Registrierung.
            Sobald die steht, meldest du dich hier ganz normal mit deinem verifizierten Minecraft-Account an.
          </div>
        )}

        {error && <div className="login-view__notice login-view__notice--error">{error}</div>}

        <button className="login-view__dev-bypass" onClick={loginDev}>
          Entwicklermodus — ohne Anmeldung weiter (temporär, bis die Anmeldung fertig ist)
        </button>
      </div>
    </div>
  );
}
