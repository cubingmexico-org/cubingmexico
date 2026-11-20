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
      delay: 0.12 + i * 0.1,
      duration: 0.5,
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
    <section className="relative h-[min(88svh,42rem)] w-full overflow-hidden md:h-[min(92svh,48rem)]">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={{ scale: prefersReducedMotion ? 1 : 1.06 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 16, ease: "linear" }
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

      {/* Fixed chrome scrim — independent of theme tokens. */}
      <div className="absolute inset-0 bg-linear-to-t from-chrome via-chrome/70 to-chrome/30" />

      <div className="relative z-10 flex h-full items-end">
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 md:pb-16">
          <motion.h1
            className="max-w-4xl font-display text-5xl font-bold uppercase tracking-wide text-white sm:text-6xl md:text-7xl lg:text-8xl"
            custom={0}
            initial="hidden"
            animate="visible"
            variants={prefersReducedMotion ? fadeUpReduced : fadeUp}
          >
            Cubing México
          </motion.h1>

          <motion.p
            className="mt-4 max-w-lg text-base text-white/85 sm:text-lg"
            custom={1}
            initial="hidden"
            animate="visible"
            variants={prefersReducedMotion ? fadeUpReduced : fadeUp}
          >
            Rankings estatales, récords nacionales y el calendario WCA de
            México.
          </motion.p>

          <motion.div
            className="mt-7 flex flex-wrap items-center gap-3"
            custom={2}
            initial="hidden"
            animate="visible"
            variants={prefersReducedMotion ? fadeUpReduced : fadeUp}
          >
            <Link
              href="/rankings/333/single"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group bg-brand hover:bg-brand-warm",
              )}
            >
              Rankings
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/competitions"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white",
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
