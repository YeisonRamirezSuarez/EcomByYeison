import { createClient } from "@sanity/client";
import { readFileSync, createReadStream, existsSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

// Cargar variables del .env.local manualmente
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-03-20",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const IMAGES_DIR = resolve(__dirname, "../images");

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function uploadAsset(relativePath) {
  const candidates = [relativePath + ".png", relativePath + ".jpg", relativePath + ".jpeg", relativePath + ".webp"];
  const filePath = [relativePath, ...candidates].find(existsSync);
  if (!filePath) {
    console.warn(`    ⚠️  Imagen no encontrada: ${relativePath}`);
    return null;
  }
  const mimeType = getMimeType(filePath);
  const asset = await client.assets.upload("image", createReadStream(filePath), {
    filename: filePath.split(/[\\/]/).pop(),
    contentType: mimeType,
  });
  return { _type: "image", asset: { _type: "reference", _ref: asset._id } };
}

// ─── AUTOR ────────────────────────────────────────────────────────────────────
const author = {
  name: "Yeison",
  slug: "yeison",
};

// ─── CATEGORÍAS DE BLOG ───────────────────────────────────────────────────────
const blogCategories = [
  { title: "Tecnología", slug: "tecnologia", description: "Noticias y tendencias del mundo tech" },
  { title: "Gadgets", slug: "gadgets", description: "Los mejores gadgets del mercado" },
  { title: "Reviews", slug: "reviews", description: "Análisis detallados de productos" },
  { title: "Consejos", slug: "consejos", description: "Tips y trucos para sacar el máximo partido a tu tecnología" },
  { title: "Gaming", slug: "gaming", description: "Todo sobre videojuegos y hardware gaming" },
];

// ─── BLOGS ────────────────────────────────────────────────────────────────────
const blogs = [
  {
    title: "Los 5 mejores auriculares inalámbricos de 2026",
    slug: "mejores-auriculares-inalambricos-2026",
    category: "reviews",
    isLatest: true,
    publishedAt: "2026-03-01T10:00:00Z",
    body: "El mercado de auriculares inalámbricos ha evolucionado enormemente. En este artículo comparamos los 5 modelos más destacados del año: Sony WH-1000XM6, AirPods Pro 3, Samsung Galaxy Buds3 Pro, LG TONE Free FP9 y Sony WF-1000XM5. Cada uno ofrece cancelación de ruido activa, conectividad multipoint y hasta 40 horas de batería. La calidad de audio ha llegado a niveles que antes solo encontrábamos en auriculares de estudio. Si buscas el mejor acompañante para trabajar, viajar o entrenar, estos son tus candidatos perfectos.",
  },
  {
    title: "iPhone 16 Pro Max vs Samsung Galaxy S25 Ultra: ¿Cuál comprar?",
    slug: "iphone-16-pro-max-vs-samsung-galaxy-s25-ultra",
    category: "reviews",
    isLatest: true,
    publishedAt: "2026-02-25T09:00:00Z",
    body: "El duelo eterno entre Apple y Samsung regresa con sus flagship más potentes. El iPhone 16 Pro Max llega con el chip A18 Pro, mientras que el Galaxy S25 Ultra responde con el Snapdragon 8 Elite. En fotografía ambos son excepcionales: Apple con su sistema de 48MP y vídeo 4K ProRes, Samsung con sus 200MP y zoom óptico de 10x. Si valoras el ecosistema y la integración con otros dispositivos Apple, el iPhone 16 Pro Max es tu camino. Si prefieres personalización, la pantalla más grande y el S Pen, el Galaxy S25 Ultra es insuperable.",
  },
  {
    title: "MacBook Pro M4: Todo lo que necesitas saber",
    slug: "macbook-pro-m4-guia-completa",
    category: "tecnologia",
    isLatest: true,
    publishedAt: "2026-02-18T11:00:00Z",
    body: "Apple ha presentado el MacBook Pro con chip M4 Pro y M4 Max, y los resultados son impresionantes. El chip M4 Pro ofrece un incremento del 40% en rendimiento respecto al M3 Pro, con hasta 48GB de memoria unificada. La pantalla Liquid Retina XDR de 14 pulgadas con ProMotion a 120Hz sigue siendo una de las mejores del mercado. La batería alcanza las 24 horas de uso real, algo inaudito en un portátil de esta potencia. Para creativos, desarrolladores y profesionales que necesitan el máximo rendimiento en un form factor portátil, este es el estándar de referencia.",
  },
  {
    title: "Guía de compra: Cómo elegir tu próxima Smart TV",
    slug: "guia-compra-smart-tv-2026",
    category: "consejos",
    isLatest: false,
    publishedAt: "2026-02-10T08:00:00Z",
    body: "Comprar una Smart TV puede ser abrumador con tantas opciones disponibles. Lo primero que debes considerar es el tamaño adecuado para tu espacio: para salas de entre 3 y 4 metros, una TV de 55 a 65 pulgadas es ideal. En cuanto a tecnología de panel, OLED ofrece los negros más profundos y el mejor contraste, mientras que QLED brilla más en habitaciones con mucha luz. Todos los modelos actuales incluyen 4K, pero asegúrate de buscar soporte para HDR10+, Dolby Vision y al menos HDMI 2.1 para gaming. Los modelos de LG y Sony OLED son los más recomendados por su procesamiento de imagen.",
  },
  {
    title: "PlayStation 5 Pro: Vale la pena el upgrade?",
    slug: "playstation-5-pro-vale-la-pena",
    category: "gaming",
    isLatest: true,
    publishedAt: "2026-02-05T14:00:00Z",
    body: "Sony lanzó la PS5 Pro con una GPU un 45% más potente que la PS5 estándar, capaz de ejecutar juegos en 4K nativo a 60fps de forma consistente. El ray tracing mejorado y la tecnología PlayStation Spectral Super Resolution son impresionantes en juegos como Spider-Man 2 y God of War Ragnarök. Sin embargo, el precio de $699 es difícil de justificar si ya tienes una PS5 original. La recomendación: si entras nuevo al ecosistema PlayStation sin consola, la Pro es la compra ideal. Si ya tienes PS5, espera a que bajen los precios o llega un juego que realmente exija ese hardware.",
  },
  {
    title: "Los mejores gadgets de productividad para trabajar desde casa",
    slug: "gadgets-productividad-home-office-2026",
    category: "gadgets",
    isLatest: false,
    publishedAt: "2026-01-28T10:30:00Z",
    body: "El home office llegó para quedarse y hay gadgets que transforman completamente tu espacio de trabajo. El Dell UltraSharp 32 con resolución 6K es perfecto para multitarea con su cobertura de color profesional. Un teclado mecánico silencioso, unos auriculares con cancelación de ruido como el Sony WH-1000XM6 y una webcam 4K marcan la diferencia en tus videollamadas. No olvides una buena iluminación de panel LED regulable para reducir fatiga visual. Con estas herramientas, tu productividad en casa puede superar fácilmente a la de una oficina convencional.",
  },
  {
    title: "Cómo sacar el máximo partido a tu smartphone: 10 trucos",
    slug: "trucos-para-sacar-maximo-partido-smartphone",
    category: "consejos",
    isLatest: false,
    publishedAt: "2026-01-20T09:15:00Z",
    body: "Muchas personas solo usan el 20% del potencial de sus smartphones. Aquí van 10 trucos que cambiarán tu experiencia: Activa el modo de batería adaptativo para prolongar la vida útil de la batería. Usa el modo desarrollador para desactivar animaciones y hacer tu teléfono más rápido. Configura Focus Mode para bloquear apps distractoras en horas de trabajo. Aprovecha las funciones de cámara profesional en modo Pro para mejores fotos. Configura atajos de gestos para las apps que más usas. Estos pequeños ajustes pueden transformar completamente tu experiencia diaria.",
  },
  {
    title: "Dell Alienware m18 R2: El monstruo del gaming portátil",
    slug: "dell-alienware-m18-r2-review",
    category: "gaming",
    isLatest: false,
    publishedAt: "2026-01-12T11:45:00Z",
    body: "El Dell Alienware m18 R2 es sin duda el portátil gaming más potente del mercado. Con una pantalla QHD+ de 18 pulgadas a 165Hz, la RTX 4090 para laptops y el procesador Intel Core i9-14900HX, ningún juego actual le supone un reto. El sistema de refrigeración Cherry MX mejorado mantiene temperaturas controladas incluso en sesiones largas. El precio de $2.999 lo convierte en una inversión seria, pero si buscas el máximo rendimiento sin compromisos y no te importa el peso de 4.2kg, es simplemente insuperable en su categoría.",
  },
];

// ─── MARCAS ──────────────────────────────────────────────────────────────────
const brands = [
  { name: "Samsung", slug: "samsung" },
  { name: "Apple", slug: "apple" },
  { name: "Sony", slug: "sony" },
  { name: "LG", slug: "lg" },
  { name: "Dell", slug: "dell" },
];

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
const categories = [
  { name: "Smartphones", slug: "smartphones" },
  { name: "Laptops", slug: "laptops" },
  { name: "Tablets", slug: "tablets" },
  { name: "Headphones", slug: "headphones" },
  { name: "Smart TVs", slug: "smart-tvs" },
  { name: "Cameras", slug: "cameras" },
  { name: "Gaming", slug: "gaming" },
  { name: "Accessories", slug: "accessories" },
];

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────
const products = [
  // Samsung
  { name: "Samsung Galaxy S25 Ultra", price: 1299, discount: 10, stock: 50, brand: "samsung", category: "smartphones", status: "new", variant: "gadget", isFeatured: true, description: "El flagship más potente de Samsung con S Pen integrado y cámara de 200MP." },
  { name: "Samsung Galaxy S25", price: 999, discount: 5, stock: 80, brand: "samsung", category: "smartphones", status: "hot", variant: "gadget", isFeatured: false, description: "Potencia y elegancia en un diseño compacto con Snapdragon 8 Elite." },
  { name: "Samsung Galaxy Tab S10", price: 749, discount: 8, stock: 40, brand: "samsung", category: "tablets", status: "new", variant: "gadget", isFeatured: false, description: "Tablet premium con pantalla AMOLED de 11 pulgadas y S Pen incluido." },
  { name: "Samsung QLED 65\" 4K", price: 1499, discount: 15, stock: 20, brand: "samsung", category: "smart-tvs", status: "sale", variant: "appliances", isFeatured: true, description: "Televisor QLED con Quantum HDR y sistema de sonido Object Tracking Sound." },
  { name: "Samsung Galaxy Buds3 Pro", price: 249, discount: 0, stock: 100, brand: "samsung", category: "headphones", status: "new", variant: "gadget", isFeatured: false, description: "Auriculares inalámbricos con cancelación de ruido activa inteligente." },
  { name: "Samsung Galaxy Watch 7", price: 329, discount: 5, stock: 60, brand: "samsung", category: "accessories", status: "hot", variant: "gadget", isFeatured: false, description: "Smartwatch con monitoreo avanzado de salud y batería de larga duración." },

  // Apple
  { name: "iPhone 16 Pro Max", price: 1199, discount: 0, stock: 70, brand: "apple", category: "smartphones", status: "new", variant: "gadget", isFeatured: true, description: "El iPhone más avanzado con chip A18 Pro y sistema de cámaras pro de 48MP." },
  { name: "iPhone 16", price: 799, discount: 0, stock: 90, brand: "apple", category: "smartphones", status: "hot", variant: "gadget", isFeatured: false, description: "Diseño elegante, chip A18 y Dynamic Island en un iPhone accesible." },
  { name: "MacBook Pro 14\" M4", price: 1999, discount: 5, stock: 30, brand: "apple", category: "laptops", status: "new", variant: "gadget", isFeatured: true, description: "Potencia profesional con chip M4 Pro, pantalla Liquid Retina XDR y hasta 24h de batería." },
  { name: "MacBook Air 13\" M3", price: 1299, discount: 8, stock: 45, brand: "apple", category: "laptops", status: "hot", variant: "gadget", isFeatured: false, description: "El portátil más fino de Apple con chip M3 y pantalla Liquid Retina." },
  { name: "iPad Pro 12.9\" M4", price: 1099, discount: 0, stock: 35, brand: "apple", category: "tablets", status: "new", variant: "gadget", isFeatured: false, description: "La tablet más potente de Apple con pantalla OLED Ultra Retina XDR." },
  { name: "AirPods Pro 3", price: 249, discount: 0, stock: 120, brand: "apple", category: "headphones", status: "new", variant: "gadget", isFeatured: false, description: "Cancelación de ruido adaptativa, audio espacial personalizado y chip H2." },
  { name: "Apple Watch Ultra 2", price: 799, discount: 0, stock: 40, brand: "apple", category: "accessories", status: "hot", variant: "gadget", isFeatured: false, description: "El smartwatch más robusto de Apple, diseñado para aventuras extremas." },

  // Sony
  { name: "Sony WH-1000XM6", price: 399, discount: 10, stock: 80, brand: "sony", category: "headphones", status: "new", variant: "gadget", isFeatured: true, description: "Los mejores auriculares con cancelación de ruido del mercado, 40h de batería." },
  { name: "Sony WF-1000XM5", price: 279, discount: 15, stock: 90, brand: "sony", category: "headphones", status: "sale", variant: "gadget", isFeatured: false, description: "Auriculares in-ear con la mejor cancelación de ruido en formato compacto." },
  { name: "Sony Bravia XR 55\" OLED", price: 1799, discount: 12, stock: 15, brand: "sony", category: "smart-tvs", status: "hot", variant: "appliances", isFeatured: true, description: "Televisor OLED con procesador cognitivo XR y sonido Acoustic Surface Audio+." },
  { name: "Sony Alpha A7 V", price: 3499, discount: 0, stock: 10, brand: "sony", category: "cameras", status: "new", variant: "gadget", isFeatured: false, description: "Cámara mirrorless full-frame con sensor de 61MP y estabilización de 8 pasos." },
  { name: "Sony PlayStation 5 Pro", price: 699, discount: 0, stock: 25, brand: "sony", category: "gaming", status: "hot", variant: "gadget", isFeatured: true, description: "La consola más potente con GPU mejorada para juegos en 4K a 120fps." },
  { name: "Sony Xperia 1 VII", price: 1299, discount: 5, stock: 20, brand: "sony", category: "smartphones", status: "new", variant: "gadget", isFeatured: false, description: "Smartphone pro-cinema con pantalla 4K HDR OLED de 6.5 pulgadas." },

  // LG
  { name: "LG OLED C4 65\"", price: 1699, discount: 20, stock: 12, brand: "lg", category: "smart-tvs", status: "sale", variant: "appliances", isFeatured: true, description: "TV OLED con negro perfecto, evo panel y procesador α9 Gen7 AI." },
  { name: "LG OLED Evo G4 77\"", price: 3299, discount: 10, stock: 8, brand: "lg", category: "smart-tvs", status: "hot", variant: "appliances", isFeatured: false, description: "El televisor OLED más brillante de LG con panel MLA y 4000 nits de pico." },
  { name: "LG Gram 16 2025", price: 1399, discount: 8, stock: 30, brand: "lg", category: "laptops", status: "new", variant: "gadget", isFeatured: false, description: "Ultrabook ligero de solo 1.1kg con pantalla IPS y batería de 80Wh." },
  { name: "LG TONE Free FP9", price: 179, discount: 10, stock: 60, brand: "lg", category: "headphones", status: "sale", variant: "gadget", isFeatured: false, description: "Auriculares inalámbricos con función Plug & Wireless y selfie stick integrado." },

  // Dell
  { name: "Dell XPS 15 OLED 2025", price: 1899, discount: 8, stock: 20, brand: "dell", category: "laptops", status: "new", variant: "gadget", isFeatured: true, description: "Laptop premium con pantalla OLED 4K, Intel Core Ultra 9 y 64GB RAM." },
  { name: "Dell XPS 13 Plus", price: 1299, discount: 5, stock: 35, brand: "dell", category: "laptops", status: "hot", variant: "gadget", isFeatured: false, description: "Diseño futurista con teclado cero distancia y pantalla InfinityEdge 13.4\"." },
  { name: "Dell Alienware m18 R2", price: 2999, discount: 10, stock: 10, brand: "dell", category: "gaming", status: "hot", variant: "gadget", isFeatured: false, description: "Laptop gaming de 18\" con RTX 4090 y pantalla QHD+ de 165Hz." },
  { name: "Dell UltraSharp 32\" 6K", price: 3499, discount: 0, stock: 5, brand: "dell", category: "accessories", status: "new", variant: "gadget", isFeatured: false, description: "Monitor profesional 6K con cobertura de color DCI-P3 al 100% y USB-C 140W." },
  { name: "Dell G16 Gaming 2025", price: 999, discount: 12, stock: 25, brand: "dell", category: "gaming", status: "sale", variant: "gadget", isFeatured: false, description: "Laptop gaming con RTX 4060, pantalla QHD de 240Hz y refrigeración mejorada." },
];

async function createBrands() {
  console.log("📦 Creando marcas...");
  const brandIds = {};
  const brandImageFiles = ["brand_1.webp", "brand_2.jpg", "brand_3.png", "brand_4.png", "brand_5.png"];
  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];
    const imgFile = brandImageFiles[i];
    const imageRef = await uploadAsset(resolve(IMAGES_DIR, "brands", imgFile));
    const doc = {
      _type: "brand",
      title: brand.name,
      slug: { _type: "slug", current: brand.slug },
      ...(imageRef && { image: imageRef }),
    };
    const result = await client.create(doc);
    brandIds[brand.slug] = result._id;
    console.log(`  ✅ Marca creada: ${brand.name}${imageRef ? " (con imagen)" : ""}`);
  }
  return brandIds;
}

async function createCategories() {
  console.log("📂 Creando categorías...");
  const categoryIds = {};
  for (const cat of categories) {
    const doc = {
      _type: "category",
      title: cat.name,
      slug: { _type: "slug", current: cat.slug },
    };
    const result = await client.create(doc);
    categoryIds[cat.slug] = result._id;
    console.log(`  ✅ Categoría creada: ${cat.name}`);
  }
  return categoryIds;
}

async function createProducts(brandIds, categoryIds) {
  console.log("🛍️  Creando productos...");
  // 23 imágenes disponibles → se asignan en orden, ciclando para productos extra
  const productImageFiles = [
    "product_1.png",  "product_2.jpg",  "product_3.png",  "product_4.png",
    "product_5.png",  "product_6.png",  "product_7.png",  "product_8.png",
    "product_9.png",  "product_10.png", "product_11.png", "product_12.png",
    "product_13.png", "product_14.png", "product_15.png", "product_16.png",
    "product_17.png", "product_18.png", "product_19.png", "product_20.png",
    "product_21.png", "product_22.png", "product_23.png",
  ];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const imgFile = productImageFiles[i % productImageFiles.length];
    const imageRef = await uploadAsset(resolve(IMAGES_DIR, "products", imgFile));
    const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const doc = {
      _type: "product",
      name: product.name,
      slug: { _type: "slug", current: slug },
      description: product.description,
      price: product.price,
      discount: product.discount,
      stock: product.stock,
      status: product.status,
      variant: product.variant,
      isFeatured: product.isFeatured,
      brand: { _type: "reference", _ref: brandIds[product.brand] },
      categories: [{ _type: "reference", _ref: categoryIds[product.category], _key: Math.random().toString(36).slice(2) }],
      ...(imageRef && { images: [{ ...imageRef, _key: Math.random().toString(36).slice(2) }] }),
    };
    await client.create(doc);
    console.log(`  ✅ ${product.name} — $${product.price}${imageRef ? " 📸" : ""}`);
  }
}

async function cleanAll() {
  console.log("🧹 Limpiando datos anteriores...");
  for (const type of ["product", "brand", "category", "blog", "blogcategory", "author"]) {
    const ids = await client.fetch(`*[_type == "${type}"]._id`);
    if (ids.length === 0) continue;
    const tx = client.transaction();
    ids.forEach((id) => tx.delete(id));
    await tx.commit();
    console.log(`  🗑️  ${ids.length} ${type}(s) eliminados`);
  }
}

async function createAuthor() {
  console.log("✍️  Creando autor...");
  const doc = {
    _type: "author",
    name: author.name,
    slug: { _type: "slug", current: author.slug },
  };
  const result = await client.create(doc);
  console.log(`  ✅ Autor creado: ${author.name}`);
  return result._id;
}

async function createBlogCategories() {
  console.log("🏷️  Creando categorías de blog...");
  const ids = {};
  for (const cat of blogCategories) {
    const doc = {
      _type: "blogcategory",
      title: cat.title,
      slug: { _type: "slug", current: cat.slug },
      description: cat.description,
    };
    const result = await client.create(doc);
    ids[cat.slug] = result._id;
    console.log(`  ✅ Categoría blog: ${cat.title}`);
  }
  return ids;
}

async function createBlogs(authorId, blogCategoryIds) {
  console.log("📝 Creando entradas de blog...");
  for (const blog of blogs) {
    const doc = {
      _type: "blog",
      title: blog.title,
      slug: { _type: "slug", current: blog.slug },
      author: { _type: "reference", _ref: authorId },
      blogcategories: [
        {
          _type: "reference",
          _ref: blogCategoryIds[blog.category],
          _key: Math.random().toString(36).slice(2),
        },
      ],
      publishedAt: blog.publishedAt,
      isLatest: blog.isLatest,
      body: [
        {
          _type: "block",
          _key: Math.random().toString(36).slice(2),
          style: "normal",
          children: [
            {
              _type: "span",
              _key: Math.random().toString(36).slice(2),
              text: blog.body,
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
    };
    await client.create(doc);
    console.log(`  ✅ Blog creado: ${blog.title}`);
  }
}

async function main() {
  console.log("\n🚀 Iniciando seed de datos...\n");
  try {
    await cleanAll();
    const brandIds = await createBrands();
    const categoryIds = await createCategories();
    await createProducts(brandIds, categoryIds);
    const authorId = await createAuthor();
    const blogCategoryIds = await createBlogCategories();
    await createBlogs(authorId, blogCategoryIds);
    console.log("\n✨ ¡Seed completado! Se han creado:");
    console.log(`   • ${brands.length} marcas`);
    console.log(`   • ${categories.length} categorías de productos`);
    console.log(`   • ${products.length} productos`);
    console.log(`   • 1 autor`);
    console.log(`   • ${blogCategories.length} categorías de blog`);
    console.log(`   • ${blogs.length} entradas de blog`);
    console.log("\n👉 Abre http://localhost:3000 para verlos\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
