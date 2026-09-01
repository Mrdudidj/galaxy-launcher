import { useEffect, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import type { FabricLoaderSummary, MinecraftVersionSummary } from "../../../../shared/minecraft";
import { useInstancesStore } from "../../state/instancesStore";
import "./CreateInstanceForm.css";

type ModLoaderChoice = "vanilla" | "fabric";

export function CreateInstanceForm({
  onCreated,
  onCancel
}: {
  onCreated: (instance: Instance) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [versions, setVersions] = useState<MinecraftVersionSummary[]>([]);
  const [name, setName] = useState("");
  const [minecraftVersion, setMinecraftVersion] = useState("");
  const [modLoaderType, setModLoaderType] = useState<ModLoaderChoice>("vanilla");
  const [fabricLoaders, setFabricLoaders] = useState<FabricLoaderSummary[]>([]);
  const [fabricLoaderVersion, setFabricLoaderVersion] = useState("");
  const [isLoadingFabricLoaders, setIsLoadingFabricLoaders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const create = useInstancesStore((s) => s.create);

  useEffect(() => {
    void window.galaxy.versions.list().then((list) => {
      setVersions(list);
      setMinecraftVersion((current) => current || (list[0]?.id ?? ""));
    });
  }, []);

  useEffect(() => {
    if (modLoaderType !== "fabric" || !minecraftVersion) return;
    setIsLoadingFabricLoaders(true);
    setFabricLoaderVersion("");
    void window.galaxy.fabric.listLoaders(minecraftVersion).then((loaders) => {
      setFabricLoaders(loaders);
      setFabricLoaderVersion(loaders.find((l) => l.stable)?.version ?? loaders[0]?.version ?? "");
      setIsLoadingFabricLoaders(false);
    });
  }, [modLoaderType, minecraftVersion]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!name.trim() || !minecraftVersion || isSubmitting) return;
    if (modLoaderType === "fabric" && !fabricLoaderVersion) return;

    setIsSubmitting(true);
    const instance = await create({
      name: name.trim(),
      minecraftVersion,
      modLoaderType,
      modLoaderVersion: modLoaderType === "fabric" ? fabricLoaderVersion : undefined
    });
    setIsSubmitting(false);
    onCreated(instance);
  }

  return (
    <form className="create-instance-form" onSubmit={(e) => void handleSubmit(e)}>
      <label className="create-instance-form__field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meine Instanz" autoFocus />
      </label>

      <label className="create-instance-form__field">
        <span>Minecraft-Version</span>
        <select value={minecraftVersion} onChange={(e) => setMinecraftVersion(e.target.value)}>
          {versions.length === 0 && <option>Lade Versionen…</option>}
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id}
            </option>
          ))}
        </select>
      </label>

      <div className="create-instance-form__field">
        <span>Mod-Loader</span>
        <div className="create-instance-form__loader-toggle">
          <button
            type="button"
            className={modLoaderType === "vanilla" ? "active" : ""}
            onClick={() => setModLoaderType("vanilla")}
          >
            Vanilla
          </button>
          <button
            type="button"
            className={modLoaderType === "fabric" ? "active" : ""}
            onClick={() => setModLoaderType("fabric")}
          >
            Fabric
          </button>
        </div>
      </div>

      {modLoaderType === "fabric" && (
        <label className="create-instance-form__field">
          <span>Fabric-Loader-Version</span>
          <select
            value={fabricLoaderVersion}
            onChange={(e) => setFabricLoaderVersion(e.target.value)}
            disabled={isLoadingFabricLoaders}
          >
            {isLoadingFabricLoaders && <option>Lade Loader-Versionen…</option>}
            {!isLoadingFabricLoaders && fabricLoaders.length === 0 && <option>Keine Loader verfügbar</option>}
            {fabricLoaders.map((l) => (
              <option key={l.version} value={l.version}>
                {l.version} {l.stable ? "" : "(instabil)"}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="create-instance-form__actions">
        <button type="button" className="create-instance-form__cancel" onClick={onCancel}>
          Abbrechen
        </button>
        <button
          type="submit"
          className="create-instance-form__submit"
          disabled={!name.trim() || isSubmitting || (modLoaderType === "fabric" && !fabricLoaderVersion)}
        >
          {isSubmitting ? "Erstelle…" : "Erstellen"}
        </button>
      </div>
    </form>
  );
}
