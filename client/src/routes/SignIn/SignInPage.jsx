import { SignIn } from "@clerk/clerk-react"

export const SignInPage = () => {
    return (
        <div className="signInPage h-full flex items-center justify-center">
            <SignIn path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard"/>
        </div>
    )
}