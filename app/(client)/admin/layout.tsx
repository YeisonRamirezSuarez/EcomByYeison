import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";
import React from "react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // Check if user is admin
  if (!isAdminEmail(userEmail)) {
    return redirect("/");
  }

  return <>{children}</>;
}
