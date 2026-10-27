import { startFakeWca } from "./fake-wca";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const server = await startFakeWca();
  return () =>
    new Promise((resolve) => {
      server.close(() => resolve());
    });
}
