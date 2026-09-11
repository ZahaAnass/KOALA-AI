import { SignIn } from "@clerk/clerk-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { clerkAppearance } from "@/components/auth/clerkAppearance";

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignIn path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" appearance={clerkAppearance} />
    </AuthLayout>
  );
}
