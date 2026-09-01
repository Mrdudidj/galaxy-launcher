import type { GalaxyApi } from "./index";

declare global {
  interface Window {
    galaxy: GalaxyApi;
  }
}
