export interface ServerProperties {
  motd: string;
  difficulty: "peaceful" | "easy" | "normal" | "hard";
  gamemode: "survival" | "creative" | "adventure" | "spectator";
  maxPlayers: number;
  pvp: boolean;
  whitelist: boolean;
  onlineMode: boolean;
  port: number;
}

export interface ServerConfig {
  name: string;
  minecraftVersion: string;
  createdAt: string;
  eulaAccepted: boolean;
  jarReady: boolean;
  properties: ServerProperties;
}

export type ServerPhase = "idle" | "downloading-jar" | "downloading-java" | "starting" | "running" | "crashed" | "error";

export interface ServerNetworkInfo {
  localAddresses: string[];
  port: number;
}
