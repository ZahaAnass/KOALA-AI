import { SignIn } from "@clerk/clerk-react"

export const SignInPage = () => {
    return (
        <div className="signin">
            <SignIn path="/sign-in" />
        </div>
    )
}