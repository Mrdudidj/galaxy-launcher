import { create } from "zustand";
import { getErrorMessage } from "../api/ipcError";

export type LaunchPhase = "idle" | "starting" | "downloading-java" | "running" | "crashed" | "error";

interface LaunchState {
  phase: LaunchPhase;
  logs: string[];
  javaProgress: { downloaded: number; total: number } | null;
  errorMessage: string | null;
  activeInstanceId: string | null;
  start: (instanceId: string) => Promise<void>;
  stop: () => Promise<void>;
  _subscribed: boolean;
  _subscribe: () => void;
}

// A single shared store instead of a per-component hook: the main process only
// ever runs one game process at a time, and both HomeView's Play button and the
// InstanceDetailPanel's Konsole tab need to observe/drive the same launch —
// independent hook instances would each keep their own stale copy of phase/logs.
export const useLaunchStore = create<LaunchState>((set, get) => ({
  phase: "idle",
  logs: [],
  javaProgress: null,
  errorMessage: null,
  activeInstanceId: null,
  _subscribed: false,

  _subscribe: () => {
    if (get()._subscribed) return;
    set({ _subscribed: true });

    window.galaxy.launch.onLog((line) => {
      set((s) => ({
        logs: [...s.logs.slice(-499), line],
        phase: s.phase === "starting" || s.phase === "downloading-java" ? "running" : s.phase
      }));
    });
    window.galaxy.launch.onJavaProgress((downloaded, total) => {
      set({ javaProgress: { downloaded, total }, phase: "downloading-java" });
    });
    window.galaxy.launch.onExit((info) => {
      set({ phase: info.crashed ? "crashed" : "idle", javaProgress: null });
    });
  },

  start: async (instanceId) => {
    set({ phase: "starting", logs: [], errorMessage: null, activeInstanceId: instanceId });
    try {
      await window.galaxy.launch.start(instanceId);
    } catch (error) {
      set({ phase: "error", errorMessage: getErrorMessage(error, "Start fehlgeschlagen.") });
    }
  },

  stop: async () => {
    await window.galaxy.launch.kill();
  }
}));
