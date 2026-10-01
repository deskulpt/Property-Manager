"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "default",
  ...rest
}: {
  children: React.ReactNode
  pendingLabel?: string
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost"
} & Omit<React.ComponentProps<typeof Button>, "type" | "variant" | "disabled" | "children">) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} disabled={pending} {...rest}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
