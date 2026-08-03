import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Suspense } from "react";
import { FooterSkeleton } from "@/components/footer-skeleton";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {children}
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
