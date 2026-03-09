import React from "react";
import { getLatestBlogs } from "@/sanity/queries";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

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
        {blogs?.map((blog) => (
          <Link
            key={blog?._id}
            href={`/blog/${blog?.slug?.current}`}
            className="group bg-white rounded-2xl border border-gray-100 hover:border-shop_light_green/40 hover:shadow-xl hover:shadow-shop_dark_green/5 transition-all duration-300 overflow-hidden flex flex-col"
          >
            {/* Image area */}
            <div className="relative h-40 bg-shop_light_bg rounded-t-2xl overflow-hidden flex items-center justify-center">
              {blog?.mainImage ? (
                <Image
                  src={urlFor(blog.mainImage).url()}
                  alt={blog?.title ?? "blog"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-shop_light_pink flex items-center justify-center text-shop_light_green group-hover:bg-shop_light_green/10 transition-colors">
                  <BookOpen size={28} strokeWidth={1.5} />
                </div>
              )}
              {blog?.blogcategories?.[0] && (
                <span className="absolute top-3 left-3 bg-shop_dark_green text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {blog.blogcategories[0].title}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-2 flex-1">
              <p className="text-[10px] font-bold text-shop_dark_green uppercase tracking-wider">Blog</p>
              <h3 className="font-bold text-darkColor text-sm leading-snug line-clamp-2 group-hover:text-shop_dark_green hoverEffect">
                {blog?.title}
              </h3>
              <p className="flex items-center gap-1 text-xs text-gray-400 mt-auto">
                <Calendar size={12} />
                {dayjs(blog.publishedAt).format("D MMM YYYY")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LatestBlog;
