import { create } from "zustand";
import defaultSkin from "../assets/default-skin.png";

interface AuthState {
  isAuthenticated: boolean;
  isDevBypass: boolean;
  playerName: string | null;
  playerUuid: string | null;
  skinUrl: string;
  glowColor: string | null;
  /** The signed-in account's real Minecraft skin, if any — a local custom skin
   *  (Skin-Editor) takes priority over this when both are present. */
  mcSkinBase64: string | null;
  loginDev: () => void;
  loginReal: () => Promise<void>;
  trySilentLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  hydrateSkin: () => Promise<void>;
  setSkin: (base64Png: string) => void;
  setGlowColor: (color: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isDevBypass: false,
  playerName: null,
  playerUuid: null,
  skinUrl: defaultSkin,
  glowColor: null,
  mcSkinBase64: null,

  // Stands in for real sign-in so the rest of the app is reachable for
  // building/testing. Clearly surfaced as a dev-only path in LoginView, never
  // a silent substitute — and never grants a real Minecraft session.
  loginDev: () => set({ isAuthenticated: true, isDevBypass: true, playerName: "Testpilot" }),

  loginReal: async () => {
    const session = await window.galaxy.auth.loginInteractive();
    set({
      isAuthenticated: true,
      isDevBypass: false,
      playerName: session.minecraftUsername,
      playerUuid: session.minecraftUuid,
      mcSkinBase64: session.skinBase64
    });
  },

  // Tried once on app start, before LoginView ever renders, so a previously
  // signed-in player doesn't have to click through the login screen again.
  trySilentLogin: async () => {
    const configured = await window.galaxy.auth.isConfigured();
    if (!configured) return false;
    const session = await window.galaxy.auth.loginSilent();
    if (!session) return false;
    set({
      isAuthenticated: true,
      isDevBypass: false,
      playerName: session.minecraftUsername,
      playerUuid: session.minecraftUuid,
      mcSkinBase64: session.skinBase64
    });
    return true;
  },

  logout: async () => {
    await window.galaxy.auth.logout().catch(() => undefined);
    set({ isAuthenticated: false, isDevBypass: false, playerName: null, playerUuid: null, mcSkinBase64: null });
  },

  // Pulls the last-saved custom skin (Skin-Editor) back in on startup, if any;
  // otherwise falls back to the real account skin from a Minecraft login, then
  // the bundled placeholder.
  hydrateSkin: async () => {
    const state = await window.galaxy.skin.get();
    const base64 = state.activeSkinBase64 ?? get().mcSkinBase64;
    set({
      skinUrl: base64 ? `data:image/png;base64,${base64}` : defaultSkin,
      glowColor: state.glowColor
    });
  },

  setSkin: (base64Png) => set({ skinUrl: `data:image/png;base64,${base64Png}` }),

  setGlowColor: (color) => set({ glowColor: color })
}));
