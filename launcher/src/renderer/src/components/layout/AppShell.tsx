import type { ReactNode } from "react";
import { InstancesDrawer } from "../instances/InstancesDrawer";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import "./AppShell.css";

export function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <TopBar />
        <div className="app-shell__content">{children}</div>
      </div>
      <InstancesDrawer />
    </div>
  );
}
