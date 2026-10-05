import { CogIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
// Relative import: the Sanity CLI (typegen) does not resolve the "@/" alias.
import { DEFAULT_THEME, THEMES } from "../../constants/themes";
import { CURRENCIES, DEFAULT_CURRENCY } from "../../constants/currencies";

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
  ],
});
