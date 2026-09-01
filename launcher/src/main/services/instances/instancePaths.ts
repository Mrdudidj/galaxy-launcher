import { app } from "electron";
import { join } from "node:path";

export function getInstancesRoot(): string {
  return join(app.getPath("userData"), "instances");
}

export function getSharedDir(): string {
  return join(getInstancesRoot(), "shared");
}

export function getSharedVersionsDir(): string {
  return join(getSharedDir(), "versions");
}

export function getSharedLibrariesDir(): string {
  return join(getSharedDir(), "libraries");
}

export function getSharedAssetsDir(): string {
  return join(getSharedDir(), "assets");
}

export function getSharedJavaDir(): string {
  return join(getSharedDir(), "java");
}

export function getInstanceDir(instanceId: string): string {
  return join(getInstancesRoot(), "instances", instanceId);
}

export function getInstanceGameDir(instanceId: string): string {
  return join(getInstanceDir(instanceId), ".minecraft");
}

export function getInstanceMetadataPath(instanceId: string): string {
  return join(getInstanceDir(instanceId), "instance.json");
}
