import { Link, Outlet } from "react-router-dom"
import { ClerkProvider, SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/clerk-react"

export const RootLayout = () => {

    const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

    if (!PUBLISHABLE_KEY) {
        throw new Error('Missing Publishable Key')
    }

    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <div className="rootLayout py-4 px-12 h-screen flex flex-col">
                <header className="flex items-center justify-between">
                    <Link to="/" className="logo flex items-center font-bold gap-2">
                        <img src="/logo.png" alt="logo" className="w-12 h-12"/>
                        <span>KOALA AI</span>
                </Link>
                <div className="user">
                    <SignedOut>
                        <SignInButton />
                    </SignedOut>
                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                </div>
            </header>
            <main className="overflow-hidden flex-1">
                <Outlet />
            </main>
        </div>
        </ClerkProvider>
    )
}