import { CogIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
// Relative import: the Sanity CLI (typegen) does not resolve the "@/" alias.
import { DEFAULT_THEME, THEMES } from "../../constants/themes";

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
  ],
});
