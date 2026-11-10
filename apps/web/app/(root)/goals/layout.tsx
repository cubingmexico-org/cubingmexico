export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8 max-w-3xl">
      {children}
    </main>
  );
}
