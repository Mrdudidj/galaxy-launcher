import { create } from "zustand";

export type AppView = "home" | "settings" | "shop" | "locker" | "skinEditor";

interface ViewState {
  currentView: AppView;
  setView: (view: AppView) => void;
  isInstancesOpen: boolean;
  openInstances: () => void;
  closeInstances: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: "home",
  setView: (view) => set({ currentView: view, isInstancesOpen: false }),
  isInstancesOpen: false,
  openInstances: () => set({ isInstancesOpen: true }),
  closeInstances: () => set({ isInstancesOpen: false })
}));
