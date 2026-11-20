import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Suspense } from "react";
import { FooterSkeleton } from "@/components/footer-skeleton";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
