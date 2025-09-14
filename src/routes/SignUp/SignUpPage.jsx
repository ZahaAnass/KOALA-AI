import { SignUp } from "@clerk/clerk-react"

export const SignUpPage = () => {
    return (
        <div className="signup">
            <SignUp path="/sign-up" />
        </div>
    )
}