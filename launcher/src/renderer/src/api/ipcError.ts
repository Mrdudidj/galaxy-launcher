// ipcRenderer.invoke() rejects with an Error whose message is wrapped in
// Electron's own boilerplate — "Error invoking remote method 'foo:bar': Error:
// <actual message>" — so displaying error.message directly leaks that prefix
// into the UI. Every place that renders an IPC catch(error) should go through
// this instead of raw error.message.
export function getErrorMessage(error: unknown, fallback = "Ein Fehler ist aufgetreten."): string {
  if (!(error instanceof Error)) return fallback;
  const match = /Error invoking remote method '[^']*':\s*(?:Error:\s*)?(.*)/s.exec(error.message);
  return (match?.[1] ?? error.message).trim();
}
