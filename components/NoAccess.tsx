"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import Logo from "./Logo";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import useStore from "@/store";
import { t } from "@/lib/i18n";

const NoAccess = ({
  details,
}: {
  details?: string;
}) => {
  const { locale } = useStore();
  const defaultDetails = details || t(locale, "noAccessDetails");

  return (
    <div className="flex items-center justify-center py-12 md:py-32 bg-gray-100 p-4">
      <Card className="w-full max-w-md p-5">
        <CardHeader className="flex items-center flex-col">
          <Logo />
          <CardTitle className="text-2xl font-bold text-center">
            {t(locale, "noAccessWelcome")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center font-medium text-darkColor/80">{defaultDetails}</p>
          <SignInButton mode="modal">
            <Button className="w-full" size="lg">
              {t(locale, "noAccessSignIn")}
            </Button>
          </SignInButton>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            {t(locale, "noAccessNoAccount")}
          </div>
          <SignUpButton mode="modal">
            <Button variant="outline" className="w-full" size="lg">
              {t(locale, "noAccessCreateAccount")}
            </Button>
          </SignUpButton>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NoAccess;
