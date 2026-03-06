import React from "react";
import { getLatestBlogs } from "@/sanity/queries";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const categoryGradients: Record<string, string> = {
  reviews:    "from-violet-100 to-purple-200",
  tecnologia: "from-blue-100 to-indigo-200",
  gadgets:    "from-cyan-100 to-sky-200",
  consejos:   "from-emerald-100 to-green-200",
  gaming:     "from-red-100 to-rose-200",
};

const LatestBlog = async () => {
  const blogs = await getLatestBlogs();
  if (!blogs?.length) return null;
  return (
    <div className="my-10 md:my-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-darkColor">Últimas entradas</h2>
          <p className="text-gray-500 text-sm mt-1">Noticias, reviews y consejos tech</p>
        </div>
        <Link
          href="/blog"
          className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-shop_dark_green hover:text-shop_light_green hoverEffect"
        >
          Ver todo <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className={`relative h-40 bg-gradient-to-br ${gradient} rounded-t-2xl overflow-hidden`}>
                {blog?.mainImage ? (
                  <Image
                    src={urlFor(blog.mainImage).url()}
                    alt={blog?.title ?? "blog"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={40} className="text-gray-300" strokeWidth={1.5} />
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
              <div className="p-4 flex flex-col gap-2 flex-1">
                <p className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={12} />
                  {dayjs(blog.publishedAt).format("D MMM YYYY")}
                </p>
                <h3 className="font-bold text-darkColor text-sm leading-snug line-clamp-2 group-hover:text-shop_dark_green hoverEffect">
                  {blog?.title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default LatestBlog;
