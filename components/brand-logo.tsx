import Link from "next/link"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  href?: string
  /** Dark footer uses white wordmark */
  variant?: "default" | "white"
  className?: string
  /** Extra tall mark for marketing heroes */
  size?: "header" | "hero"
}

/**
 * Easy Rental wordmark — SVG preferred, PNG fallback.
 * Preferences: never JPG; header mark larger than nav text.
 */
export function BrandLogo({
  href = "/",
  variant = "default",
  className,
  size = "header",
}: BrandLogoProps) {
  const src = variant === "white" ? "/logo-white.svg" : "/logo.svg"
  const height =
    size === "hero" ? "h-14 w-auto md:h-20" : "h-11 w-auto md:h-14"
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- static public brand asset
    <img
      src={src}
      alt="Easy Rental"
      width={560}
      height={112}
      className={cn(height, "max-w-[min(70vw,280px)] object-contain object-left", className)}
      decoding="async"
    />
  )
  if (!href) return img
  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="Easy Rental home">
      {img}
    </Link>
  )
}
