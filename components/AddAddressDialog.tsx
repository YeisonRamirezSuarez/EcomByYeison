"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAddress } from "@/actions/createAddress";
import { Address } from "@/sanity.types";
import useStore from "@/store";
import { t } from "@/lib/i18n";
import toast from "react-hot-toast";

/**
 * "Add address" button + dialog form. Submits to the createAddress server
 * action (which derives the owner from Clerk) and reports the new address back
 * to the cart via onCreated so it can refresh and select it.
 */
const AddAddressDialog = ({
  onCreated,
}: {
  onCreated: (address: Address) => void;
}) => {
  const { locale } = useStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      const created = await createAddress({
        name: String(form.get("name") ?? ""),
        address: String(form.get("address") ?? ""),
        city: String(form.get("city") ?? ""),
        state: String(form.get("state") ?? ""),
        zip: String(form.get("zip") ?? ""),
        default: form.get("default") === "on",
      });
      if (!created) {
        toast.error(t(locale, "addrError"));
        return;
      }
      onCreated(created);
      setOpen(false);
    } catch (error) {
      console.error("Error creating address:", error);
      toast.error(t(locale, "addrError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4">
          {t(locale, "cartAddNewAddress")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(locale, "addrFormTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="addr-name">{t(locale, "addrName")}</Label>
            <Input id="addr-name" name="name" required maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-street">{t(locale, "addrStreet")}</Label>
            <Input id="addr-street" name="address" required maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addr-city">{t(locale, "addrCity")}</Label>
              <Input id="addr-city" name="city" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-state">{t(locale, "addrState")}</Label>
              <Input id="addr-state" name="state" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-zip">{t(locale, "addrZip")}</Label>
            <Input id="addr-zip" name="zip" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="default" className="h-4 w-4" />
            {t(locale, "addrDefault")}
          </label>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              {t(locale, "addrCancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t(locale, "addrSaving") : t(locale, "addrSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAddressDialog;
