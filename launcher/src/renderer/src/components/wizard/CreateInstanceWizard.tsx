import { useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import { CreateInstanceForm } from "./CreateInstanceForm";
import { StepKeybinds } from "./StepKeybinds";
import { StepMods } from "./StepMods";
import { StepResourcePacks } from "./StepResourcePacks";
import { StepServers } from "./StepServers";
import { StepWorlds } from "./StepWorlds";

type WizardStep = "basics" | "mods" | "keybinds" | "resourcepacks" | "worlds" | "servers";

export function CreateInstanceWizard({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [step, setStep] = useState<WizardStep>("basics");
  const [instance, setInstance] = useState<Instance | null>(null);

  if (step === "basics" || !instance) {
    return (
      <CreateInstanceForm
        onCreated={(created) => {
          setInstance(created);
          setStep("mods");
        }}
        onCancel={onDone}
      />
    );
  }

  switch (step) {
    case "mods":
      return <StepMods instance={instance} onNext={() => setStep("keybinds")} />;
    case "keybinds":
      return <StepKeybinds instance={instance} onNext={() => setStep("resourcepacks")} onBack={() => setStep("mods")} />;
    case "resourcepacks":
      return (
        <StepResourcePacks
          instance={instance}
          onNext={() => setStep("worlds")}
          onBack={() => setStep("keybinds")}
        />
      );
    case "worlds":
      return (
        <StepWorlds instance={instance} onNext={() => setStep("servers")} onBack={() => setStep("resourcepacks")} />
      );
    case "servers":
      return <StepServers instance={instance} onFinish={onDone} onBack={() => setStep("worlds")} />;
  }
}
