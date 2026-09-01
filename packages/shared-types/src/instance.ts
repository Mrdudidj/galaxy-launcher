import { z } from "zod";

export const ModLoaderType = z.enum(["vanilla", "fabric", "forge", "quilt"]);
export type ModLoaderType = z.infer<typeof ModLoaderType>;

export const InstanceModRef = z.object({
  source: z.enum(["modrinth", "local"]),
  projectId: z.string().optional(),
  versionId: z.string().optional(),
  fileName: z.string(),
  enabled: z.boolean()
});
export type InstanceModRef = z.infer<typeof InstanceModRef>;

export const InstanceResourcePackRef = z.object({
  fileName: z.string(),
  enabled: z.boolean()
});
export type InstanceResourcePackRef = z.infer<typeof InstanceResourcePackRef>;

export const Instance = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  createdAt: z.string(),
  lastPlayedAt: z.string().nullable(),
  totalPlayTimeSeconds: z.number(),
  minecraftVersion: z.string(),
  // The exact version id to hand to the launcher (e.g. the fabric-merged version
  // json id) — distinct from `minecraftVersion`, which stays the plain vanilla
  // base version. Set once the instance's files finish downloading; null until then.
  resolvedVersionId: z.string().nullable().default(null),
  modLoader: z.object({
    type: ModLoaderType,
    version: z.string().nullable()
  }),
  javaRuntime: z.object({
    majorVersion: z.number(),
    customPath: z.string().nullable()
  }),
  memory: z.object({
    minMb: z.number(),
    maxMb: z.number()
  }),
  resolution: z.object({
    width: z.number(),
    height: z.number(),
    fullscreen: z.boolean()
  }),
  extraJvmArgs: z.array(z.string()),
  group: z.string().nullable(),
  mods: z.array(InstanceModRef),
  resourcePacks: z.array(InstanceResourcePackRef)
});
export type Instance = z.infer<typeof Instance>;
