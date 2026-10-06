import { CogIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";
// Relative imports: the Sanity CLI (typegen) does not resolve the "@/" alias.
import { DEFAULT_THEME, THEMES } from "../../constants/themes";
import { CURRENCIES, DEFAULT_CURRENCY } from "../../constants/currencies";
import {
  CONTENT_ICONS,
  PAGE_KEYS,
  PAGE_LABELS,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
} from "../../lib/validation";

const text = (name: string, title: string) => defineField({ name, title, type: "string" });
const longText = (name: string, title: string) =>
  defineField({ name, title, type: "text", rows: 3 });
const image = (name: string, title: string) => defineField({ name, title, type: "image" });
const cta = (name: string, title: string) =>
  defineField({ name, title, type: "object", fields: [text("label", "Texto"), text("href", "Enlace")] });

const pageFields = PAGE_KEYS.map((key) =>
  defineField({
    name: key,
    title: PAGE_LABELS[key],
    type: "object",
    fields: [
      longText("intro", "Introducción"),
      defineField({
        name: "blocks",
        title: "Bloques",
        type: "array",
        of: [
          defineArrayMember({
            type: "object",
            name: "contentBlock",
            title: "Bloque",
            fields: [
              defineField({
                name: "icon",
                title: "Ícono",
                type: "string",
                options: {
                  list: Object.entries(CONTENT_ICONS).map(([value, title]) => ({ title, value })),
                },
              }),
              text("title", "Título"),
              longText("text", "Texto"),
              text("href", "Enlace"),
            ],
          }),
        ],
      }),
    ],
  })
);

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Configuración de la tienda",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "theme",
      title: "Paleta",
      type: "string",
      initialValue: DEFAULT_THEME,
      options: {
        list: Object.entries(THEMES).map(([value, theme]) => ({
          title: theme.name,
          value,
        })),
      },
    }),
    defineField({
      name: "currency",
      title: "Moneda",
      type: "string",
      initialValue: DEFAULT_CURRENCY,
      options: {
        list: Object.entries(CURRENCIES).map(([value, currency]) => ({
          title: currency.name,
          value,
        })),
      },
    }),
    text("storeName", "Nombre de la tienda"),
    text("tagline", "Eslogan"),
    longText("description", "Descripción"),
    defineField({
      name: "logoType",
      title: "Tipo de logo",
      type: "string",
      options: {
        list: [
          { title: "Texto", value: "text" },
          { title: "Imagen", value: "image" },
        ],
        layout: "radio",
      },
    }),
    text("logoText", "Logo: texto principal"),
    text("logoSubtext", "Logo: texto secundario"),
    image("logoImage", "Logo: imagen"),
    image("favicon", "Favicon"),
    defineField({
      name: "banner",
      title: "Banner de portada",
      type: "object",
      fields: [
        text("badge", "Etiqueta"),
        text("title", "Título"),
        text("highlight", "Parte resaltada"),
        text("subtitle", "Subtítulo"),
        longText("description", "Descripción"),
        cta("primaryCta", "Botón principal"),
        cta("secondaryCta", "Botón secundario"),
        image("image", "Imagen"),
        defineField({
          name: "stats",
          title: "Cifras",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "bannerStat",
              title: "Cifra",
              fields: [text("value", "Valor"), text("label", "Etiqueta")],
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "contact",
      title: "Contacto",
      type: "object",
      fields: [
        text("email", "Correo"),
        text("phone", "Teléfono"),
        text("address", "Dirección"),
        text("hours", "Horario"),
      ],
    }),
    defineField({
      name: "social",
      title: "Redes sociales",
      type: "object",
      fields: SOCIAL_KEYS.map((key) => text(key, SOCIAL_LABELS[key])),
    }),
    defineField({ name: "pages", title: "Páginas", type: "object", fields: pageFields }),
  ],
});
