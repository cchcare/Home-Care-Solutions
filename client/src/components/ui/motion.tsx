import { motion, useReducedMotion, type Variants, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Subtle motion primitives for page-level and card-grid entrances.
 *
 * Scope intentionally: use these for page containers, stat-card rows, and
 * empty/loading states — NOT per-row in large tables or lists (animating
 * hundreds of rows individually costs real paint/layout time and reads as
 * sluggish, not "premium"). Large lists should mount instantly; a single
 * FadeIn around the list container is enough motion.
 *
 * Respects prefers-reduced-motion automatically via useReducedMotion().
 */

const EASE = [0.16, 1, 0.3, 1] as const; // premium "ease-out-expo"-ish curve

export function FadeIn({
  children,
  delay = 0,
  duration = 0.35,
  y = 8,
  className,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; duration?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : duration, delay: reduce ? 0 : delay, ease: EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

/** Wrap a grid/row of cards (e.g. dashboard stat cards) to fade+rise in with
 *  a short stagger between siblings. Children should be <StaggerItem>. */
export function StaggerContainer({
  children,
  className,
  ...props
}: Omit<HTMLMotionProps<"div">, "children"> & { children?: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerItemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/** Animated presence-friendly fade for content that swaps (e.g. tab panels,
 *  a section that toggles between loading/loaded). Use as a direct wrapper,
 *  keyed by whatever makes the content "new" (e.g. `key={activeTab}`). */
export function FadeSwitch({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
