"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.12,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const fadeUpReduced = {
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
};

export function HomeHero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative h-[min(100svh,56rem)] w-full overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={{ scale: prefersReducedMotion ? 1 : 1.08 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 14, ease: "linear" }
        }
      >
        <Image
          alt="Competidores de speedcubing"
          className="object-cover object-center"
          fill
          src="/competidores.jpg"
          priority
        />
      </motion.div>

      <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 to-black/35" />

      <div className="relative z-10 flex h-full items-end md:items-center">
        <div className="container mx-auto px-5 pb-16 pt-28 md:pb-24 md:pt-20">
          <motion.h1
            className="font-display text-5xl font-bold uppercase tracking-wide text-white sm:text-6xl md:text-7xl lg:text-8xl"
            custom={0}
            initial="hidden"
            animate="visible"
            variants={prefersReducedMotion ? fadeUpReduced : fadeUp}
          >
            Cubing México
          </motion.h1>

          <motion.p
            className="mt-4 max-w-xl text-lg text-white/85 md:text-xl"
            custom={1}
            initial="hidden"
            animate="visible"
            variants={prefersReducedMotion ? fadeUpReduced : fadeUp}
          >
            Descubre los mejores cuberos, récords y competencias de México
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-4"
            custom={2}
            initial="hidden"
            animate="visible"
            variants={prefersReducedMotion ? fadeUpReduced : fadeUp}
          >
            <Link
              href="/rankings/333/single"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group bg-brand text-white hover:bg-brand-warm",
              )}
            >
              Ver Rankings
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/competitions"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
              )}
            >
              Competencias
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
