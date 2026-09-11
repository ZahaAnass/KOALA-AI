import { SignUp } from "@clerk/clerk-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { clerkAppearance } from "@/components/auth/clerkAppearance";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" appearance={clerkAppearance} />
    </AuthLayout>
  );
}
