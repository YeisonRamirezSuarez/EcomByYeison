import { redirect } from "next/navigation";

// Silent fallback route: when popup auth falls back to path, do not render UI.
export default function SignInPage() {
  redirect("/");
}
