import { SignIn } from "@clerk/nextjs";

// Fallback route for OAuth/callback when popup is blocked or flow falls back to redirect.
export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-shop_light_bg">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/"
        fallbackRedirectUrl="/"
        signUpForceRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      />
    </div>
  );
}
