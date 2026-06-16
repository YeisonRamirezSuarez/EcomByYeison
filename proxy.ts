import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk's Frontend API host is encoded inside the publishable key
 * (`pk_test_<base64(host$)>` / `pk_live_<base64(host$)>`). Decoding it lets the
 * CSP allowlist follow the environment automatically — `*.clerk.accounts.dev`
 * in dev/test and the production `clerk.<domain>` host once a pk_live is set —
 * without hardcoding anything.
 */
function getClerkHost(): string {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const b64 = pk.replace(/^pk_(test|live)_/, "");
  try {
    return atob(b64).replace(/\$$/, "");
  } catch {
    return "";
  }
}

const clerkHost = getClerkHost();
const clerkSrc = clerkHost ? `https://${clerkHost}` : "";

/**
 * Builds a per-request Content-Security-Policy.
 *
 * - Scripts use a per-request nonce + `strict-dynamic`: only our nonce'd inline
 *   script and Next's bootstrap scripts are trusted, and anything they load
 *   (Clerk's clerk-js) is trusted by propagation — so we don't have to track
 *   Clerk's exact script URLs. The `https:`/`http:` fallback is ignored by
 *   browsers that support strict-dynamic and only there for legacy ones.
 * - `style-src 'unsafe-inline'`: Tailwind, Clerk and react-hot-toast inject
 *   inline styles; nonce-ing every style isn't feasible here.
 * - Stripe checkout is a top-level redirect to checkout.stripe.com (no embedded
 *   Stripe.js), so it only needs form-action/frame-src, not script-src.
 */
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://cdn.sanity.io https://img.clerk.com`,
    `font-src 'self' data:`,
    `connect-src 'self' ${clerkSrc} https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.api.sanity.io https://*.apicdn.sanity.io wss://*.api.sanity.io`,
    `worker-src 'self' blob:`,
    `frame-src 'self' ${clerkSrc} https://challenges.cloudflare.com https://checkout.stripe.com`,
    `form-action 'self' https://checkout.stripe.com`,
    `frame-ancestors 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ]
    .filter(Boolean)
    .join("; ");
}

export default clerkMiddleware(async (_auth, req) => {
  // Sanity Studio (/studio) is a heavy SPA that needs unsafe-eval, blob workers
  // and inline styles a strict CSP would break. It's same-origin and behind its
  // own auth, so we leave it out of the policy entirely.
  if (req.nextUrl.pathname.startsWith("/studio")) {
    return NextResponse.next();
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Next.js reads the nonce from the CSP on the *request* headers and applies it
  // to its own <script> tags, so it must be set on both request and response.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
