"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "default",
}: {
  children: React.ReactNode
  pendingLabel?: string
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
