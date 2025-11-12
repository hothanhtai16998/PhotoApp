import { SignupForm } from "../components/auth/signup-form"
import Header from "@/components/Header"
export default function SignupPage() {
    return (
        <>
            <Header />
            <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 absolute inset-10 z-10">
                <div className="w-full max-w-sm md:max-w-4xl">
                    <SignupForm />
                </div>
            </div>
        </>
    )
}