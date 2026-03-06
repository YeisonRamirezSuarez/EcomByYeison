import Container from "@/components/Container";
import { urlFor } from "@/sanity/lib/image";
import { getAllBlogs } from "@/sanity/queries";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

dayjs.locale("es");

const categoryGradients: Record<string, string> = {
  reviews:    "from-violet-100 to-purple-200",
  tecnologia: "from-blue-100 to-indigo-200",
  gadgets:    "from-cyan-100 to-sky-200",
  consejos:   "from-emerald-100 to-green-200",
  gaming:     "from-red-100 to-rose-200",
};

const BlogPage = async () => {
  const blogs = await getAllBlogs(20);

  return (
    <div className="py-10">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-darkColor">Blog</h1>
          <p className="text-gray-500 mt-1">Noticias, reviews y consejos del mundo tech</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {blogs?.map((blog) => {
            const catSlug = blog?.blogcategories?.[0]?.title?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
            const gradient = categoryGradients[catSlug] ?? "from-gray-100 to-gray-200";
            return (
              <Link
                key={blog?._id}
                href={`/blog/${blog?.slug?.current}`}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-shop_light_green/40 hover:shadow-xl hover:shadow-shop_dark_green/5 transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Image / gradient header */}
                <div className={`relative h-48 bg-gradient-to-br ${gradient} rounded-t-2xl overflow-hidden`}>
                  {blog?.mainImage ? (
                    <Image
                      src={urlFor(blog.mainImage).url()}
                      alt={blog?.title ?? "blog"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={48} className="text-gray-300" strokeWidth={1.5} />
                    </div>
                  )}
                  {/* Category badge */}
                  {blog?.blogcategories?.[0] && (
                    <span className="absolute top-3 left-3 bg-shop_dark_green text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {blog.blogcategories[0].title}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-2 flex-1">
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={12} />
                    {dayjs(blog.publishedAt).format("D [de] MMMM [de] YYYY")}
                  </p>
                  <h2 className="font-bold text-darkColor text-base leading-snug line-clamp-2 group-hover:text-shop_dark_green hoverEffect">
                    {blog?.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-auto flex items-center gap-1 pt-2">
                    Leer más <ArrowRight size={11} />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </div>
  );
};

export default BlogPage;
