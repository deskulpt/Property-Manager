import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata = { title: "Forgot password" }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Password reset"
      lede="Stub for Slice A: we queue a labelled demo email row. Live SMTP arrives when the notification broker is configured."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-terra hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
