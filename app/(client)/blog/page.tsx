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

const BlogPage = async () => {
  const blogs = await getAllBlogs(20);

  return (
    <div className="py-10">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-darkColor">Blog</h1>
          <p className="text-gray-500 mt-1">Noticias, reviews y consejos del mundo tech</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {blogs?.map((blog) => (
            <Link
              key={blog?._id}
              href={`/blog/${blog?.slug?.current}`}
              className="group bg-white rounded-2xl border border-gray-100 hover:border-shop_light_green/40 hover:shadow-xl hover:shadow-shop_dark_green/5 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="relative h-48 bg-shop_light_bg rounded-t-2xl overflow-hidden flex items-center justify-center">
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

              <div className="p-5 flex flex-col gap-2 flex-1">
                <p className="text-[10px] font-bold text-shop_dark_green uppercase tracking-wider">Blog</p>
                <h2 className="font-bold text-darkColor text-base leading-snug line-clamp-2 group-hover:text-shop_dark_green hoverEffect">
                  {blog?.title}
                </h2>
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-auto pt-2">
                  <Calendar size={12} />
                  {dayjs(blog.publishedAt).format("D [de] MMMM [de] YYYY")}
                  <span className="ml-auto flex items-center gap-1">Leer mas <ArrowRight size={11} /></span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
};

export default BlogPage;
