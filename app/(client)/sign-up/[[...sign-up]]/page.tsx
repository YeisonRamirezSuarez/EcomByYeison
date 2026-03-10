import { SignUp } from "@clerk/nextjs";

// Fallback route for OAuth/sign-up completion when popup flow falls back to redirect.
export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-shop_light_bg">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/"
        fallbackRedirectUrl="/"
        signInForceRedirectUrl="/"
        signInFallbackRedirectUrl="/"
      />
    </div>
  );
}
