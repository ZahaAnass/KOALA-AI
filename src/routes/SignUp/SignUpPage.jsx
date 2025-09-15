import { SignUp } from "@clerk/clerk-react"

export const SignUpPage = () => {
    return (
        <div className="signUpPage h-full flex items-center justify-center">
            <SignUp path="/sign-up" signInUrl="/sign-in"/>
        </div>
    )
}