import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const blogCategoryType = defineType({
  name: "blogcategory",
  title: "Blog Category",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({ name: "titleEn", title: "Title (English)", type: "string" }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
      },
    }),
    defineField({
      name: "description",
      type: "text",
    }),
  ],
  preview: {
    select: { title: "title", titleEn: "titleEn", subtitle: "description" },
    // English-only stores leave the Spanish title empty.
    prepare: ({ title, titleEn, subtitle }) => ({ title: title || titleEn, subtitle }),
  },
});
