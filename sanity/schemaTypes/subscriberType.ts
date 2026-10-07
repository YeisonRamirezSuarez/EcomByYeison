import { EnvelopeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const subscriberType = defineType({
  name: "subscriber",
  title: "Suscriptor",
  type: "document",
  icon: EnvelopeIcon,
  readOnly: true,
  fields: [
    defineField({ name: "email", title: "Correo", type: "string" }),
    defineField({ name: "consent", title: "Aceptó recibir correos", type: "boolean" }),
    defineField({ name: "subscribedAt", title: "Fecha", type: "datetime" }),
    defineField({ name: "source", title: "Origen", type: "string" }),
    defineField({
      name: "status",
      title: "Estado",
      type: "string",
      options: { list: [{ title: "Activo", value: "active" }, { title: "Dado de baja", value: "unsubscribed" }] },
    }),
    defineField({ name: "unsubscribedAt", title: "Fecha de baja", type: "datetime" }),
  ],
  preview: { select: { title: "email", subtitle: "subscribedAt" } },
});
