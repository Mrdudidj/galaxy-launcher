import { useEffect, useState } from "react";
import { useInvalidateEconomy } from "./api/useEconomy";
import { AppShell } from "./components/layout/AppShell";
import { AdminConsoleView } from "./screens/AdminConsoleView";
import { FoundersView } from "./screens/FoundersView";
import { HomeView } from "./screens/HomeView";
import { LockerView } from "./screens/LockerView";
import { LoginView } from "./screens/LoginView";
import { NowPlayingWidget } from "./screens/NowPlayingWidget";
import { SettingsView } from "./screens/SettingsView";
import { ShopView } from "./screens/ShopView";
import { SkinEditorView } from "./screens/SkinEditorView";
import { useAuthStore } from "./state/authStore";
import { useInstancesStore } from "./state/instancesStore";
import { useLaunchStore } from "./state/launchStore";
import { useViewStore } from "./state/viewStore";

// Static for the lifetime of this window (it's how spotifyWidgetWindow.ts
// tells "this is the little overlay" apart from the normal app shell without
// a second Vite entry point) — safe to read outside any hook.
const isSpotifyWidget = new URLSearchParams(window.location.search).get("widget") === "spotify";

function App(): React.JSX.Element {
  if (isSpotifyWidget) {
    return <NowPlayingWidget />;
  }

  return <MainApp />;
}

function MainApp(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrateSkin = useAuthStore((s) => s.hydrateSkin);
  const trySilentLogin = useAuthStore((s) => s.trySilentLogin);
  const currentView = useViewStore((s) => s.currentView);
  const refreshInstances = useInstancesStore((s) => s.refresh);
  const selectInstance = useInstancesStore((s) => s.select);
  const invalidateEconomy = useInvalidateEconomy();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    useLaunchStore.getState()._subscribe();
    void trySilentLogin().finally(() => setIsBootstrapping(false));
    // Only ever tried once, right when the app opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void hydrateSkin();
    void refreshInstances().then(async () => {
      const launchInstanceId = await window.galaxy.app.getLaunchInstanceId();
      if (launchInstanceId) selectInstance(launchInstanceId);
    });
    // There's no multi-user backend yet — every account that ever signs in on
    // this local install (dev-bypass or a real Microsoft account) is by
    // definition the person running their own copy of Galaxy Launcher, so
    // owner rank is safe to auto-grant here. Once accounts are backend-synced
    // across installs, this needs to move server-side instead.
    void window.galaxy.economy.setRank("owner").then(() => invalidateEconomy());
    // The main process's Discord RPC connection is purely in-memory — it resets
    // on every app restart regardless of what was saved in settings.json, so a
    // previously-"enabled" toggle needs an actual reconnect here, not just a
    // status check, or Settings shows a stale "on" checkbox that's really dead.
    void window.galaxy.settings.get().then((settings) => {
      if (settings.discordRpc.enabled) void window.galaxy.discord.connect();
    });
    // Runs once per sign-in — refreshInstances/selectInstance/hydrateSkin/invalidateEconomy are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isBootstrapping) {
    return <div style={{ height: "100vh", width: "100vw" }} />;
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <AppShell>
      <div key={currentView} className="view-transition">
        {currentView === "home" && <HomeView />}
        {currentView === "settings" && <SettingsView />}
        {currentView === "shop" && <ShopView />}
        {currentView === "locker" && <LockerView />}
        {currentView === "skinEditor" && <SkinEditorView />}
        {currentView === "founders" && <FoundersView />}
        {currentView === "adminConsole" && <AdminConsoleView />}
      </div>
    </AppShell>
  );
}

export default App;
