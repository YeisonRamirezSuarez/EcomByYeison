"use client";

import React, { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { subscribe } from "@/actions/newsletter";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const NewsletterForm = ({ storeName }: { storeName: string }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await subscribe({
        email: String(data.get("email") ?? ""),
        consent: data.get("consent") === "on",
        website: String(data.get("website") ?? ""),
      });
      if (!result.ok) {
        setErrors(result.errors);
        if (result.errors.form) toast.error(result.errors.form);
        return;
      }
      setErrors({});
      form.reset();
      toast.success(result.message);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Input
        name="email"
        type="email"
        placeholder="Tu correo electrónico"
        aria-label="Tu correo electrónico"
        aria-invalid={Boolean(errors.email)}
      />
      {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" name="consent" className="mt-0.5" />
        Acepto recibir correos de {storeName}
      </label>
      {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}
      {/* Honeypot: hidden from people, filled by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-shop_dark_green hover:bg-shop_dark_green/90 text-white"
      >
        {pending ? "Enviando…" : "Suscribirme"}
      </Button>
    </form>
  );
};

export default NewsletterForm;
