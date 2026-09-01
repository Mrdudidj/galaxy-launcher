import { create } from "zustand";
import type { Instance } from "@galaxy-launcher/shared-types";
import type { CreateInstanceInput } from "../../../shared/instance";

interface InstancesState {
  instances: Instance[];
  selectedInstanceId: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  create: (input: CreateInstanceInput) => Promise<Instance>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string, newName: string) => Promise<void>;
  select: (id: string | null) => void;
}

export const useInstancesStore = create<InstancesState>((set, get) => ({
  instances: [],
  selectedInstanceId: null,
  isLoading: false,

  refresh: async () => {
    set({ isLoading: true });
    const instances = await window.galaxy.instances.list();
    const selectedStillExists = instances.some((i) => i.id === get().selectedInstanceId);
    set({
      instances,
      isLoading: false,
      selectedInstanceId: selectedStillExists ? get().selectedInstanceId : (instances[0]?.id ?? null)
    });
  },

  create: async (input) => {
    const instance = await window.galaxy.instances.create(input);
    set((state) => ({ instances: [instance, ...state.instances], selectedInstanceId: instance.id }));
    return instance;
  },

  remove: async (id) => {
    await window.galaxy.instances.delete(id);
    await get().refresh();
  },

  duplicate: async (id, newName) => {
    const instance = await window.galaxy.instances.duplicate(id, newName);
    set((state) => ({ instances: [instance, ...state.instances], selectedInstanceId: instance.id }));
  },

  select: (id) => set({ selectedInstanceId: id })
}));
