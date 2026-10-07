import { defineQuery } from "next-sanity";

const BRANDS_QUERY = defineQuery(`*[_type=='brand'] | order(title asc) `);

const LATEST_BLOG_QUERY = defineQuery(
  ` *[_type == 'blog' && isLatest == true]|order(name asc){
      ...,
      blogcategories[]->{
      title, titleEn
    }
    }`
);

const DEAL_PRODUCTS = defineQuery(
  `*[_type == 'product' && archived != true && status == 'hot'] | order(name asc){
    ...,"categories": categories[]->{ title, titleEn }
  }`
);

const PRODUCT_BY_SLUG_QUERY = defineQuery(
  `*[_type == "product" && archived != true && slug.current == $slug] | order(name asc) [0]`
);

const BRAND_QUERY = defineQuery(`*[_type == "product" && archived != true && slug.current == $slug]{
  "brandName": brand->title, "brandNameEn": brand->titleEn
  }`);

const MY_ORDERS_QUERY =
  defineQuery(`*[_type == 'order' && clerkUserId == $userId] | order(orderDate desc){
...,products[]{
  ...,product->
}
}`);

// Admin orders list (polled every 10 s): only what the list and drawer show.
// ponytail: all orders in one response; paginate on the server when a store has many thousands.
const ADMIN_ORDERS_QUERY = defineQuery(`*[_type == 'order'] | order(orderDate desc){
  _id, orderNumber, customerName, email, status, orderDate, totalPrice, currency, amountDiscount, address,
  products[]{ _key, quantity, product->{ _id, name, price, "images": images[0...1] } }
}`);
const SHOP_PRODUCTS_QUERY = defineQuery(`*[_type == 'product' && archived != true
  && (!defined($selectedCategory) || references(*[_type == "category" && slug.current == $selectedCategory]._id))
  && (!defined($selectedBrand) || references(*[_type == "brand" && slug.current == $selectedBrand]._id))
  && price >= $minPrice && (!defined($maxPrice) || price <= $maxPrice)
] | order(name asc) {
  ...,"categories": categories[]->{ title, titleEn }
}`);
const GET_ALL_BLOG = defineQuery(
  `*[_type == 'blog'] | order(publishedAt desc)[0...$quantity]{
  ...,  
     blogcategories[]->{
    title, titleEn
}
    }
  `
);

const SINGLE_BLOG_QUERY =
  defineQuery(`*[_type == "blog" && slug.current == $slug][0]{
  ..., 
    author->{
    name,
    image,
  },
  blogcategories[]->{
    title,
    titleEn,
    "slug": slug.current,
  },
}`);

const BLOG_CATEGORIES = defineQuery(
  `*[_type == "blog"]{
     blogcategories[]->{
    ...
    }
  }`
);

const OTHERS_BLOG_QUERY = defineQuery(`*[
  _type == "blog"
  && defined(slug.current)
  && slug.current != $slug
]|order(publishedAt desc)[0...$quantity]{
...
  publishedAt,
  title,
  titleEn,
  mainImage,
  slug,
  author->{
    name,
    image,
  },
  categories[]->{
    title,
    "slug": slug.current,
  }
}`);
export {
  BRANDS_QUERY,
  LATEST_BLOG_QUERY,
  DEAL_PRODUCTS,
  PRODUCT_BY_SLUG_QUERY,
  BRAND_QUERY,
  MY_ORDERS_QUERY,
  ADMIN_ORDERS_QUERY,
  GET_ALL_BLOG,
  SINGLE_BLOG_QUERY,
  BLOG_CATEGORIES,
  OTHERS_BLOG_QUERY,
  SHOP_PRODUCTS_QUERY,
};
