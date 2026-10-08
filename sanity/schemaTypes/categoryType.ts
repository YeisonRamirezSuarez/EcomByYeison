import { defineField, defineType } from "sanity";
import { TagIcon } from "@sanity/icons";

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (Rule) =>
        Rule.custom((title, context) => (title || context.document?.titleEn ? true : "Write the title in Spanish or English")),
    }),
    defineField({ name: "titleEn", title: "Title (English)", type: "string" }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: (doc) => String(doc.title || doc.titleEn || ""),
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
    }),
    defineField({ name: "descriptionEn", title: "Description (English)", type: "text" }),
    defineField({
      name: "range",
      type: "number",
      description: "Starting from",
    }),
    defineField({
      name: "featured",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "image",
      title: "Category Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
  ],
  preview: {
    select: {
      title: "title",
      titleEn: "titleEn",
      subtitle: "description",
      subtitleEn: "descriptionEn",
      media: "image",
    },
    // English-only stores leave the Spanish texts empty.
    prepare: ({ title, titleEn, subtitle, subtitleEn, media }) => ({ title: title || titleEn, subtitle: subtitle || subtitleEn, media }),
  },
});
