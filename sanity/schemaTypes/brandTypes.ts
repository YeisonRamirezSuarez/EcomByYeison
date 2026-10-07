import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const brandType = defineType({
  name: "brand",
  title: "Brand",
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
        source: (doc) => String(doc.title || doc.titleEn || ""),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
    }),
    defineField({ name: "descriptionEn", title: "Description (English)", type: "text" }),
    defineField({
      name: "image",
      title: "Brand Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "image",
    },
  },
});
