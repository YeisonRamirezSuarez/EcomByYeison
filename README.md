# Ecom by Yeison 🛒

Tienda de comercio electrónico de tecnología construida con **Next.js 15**, **Sanity CMS**, **Clerk** y **Stripe**. Incluye catálogo de productos, carrito, lista de deseos, checkout real, blog y panel de administración.

---

## ✨ Características

- 🛍️ Catálogo con 28+ productos de marcas reales (Samsung, Apple, Sony, LG, Dell)
- 🔍 Filtros por categoría, marca y precio en la tienda
- 🛒 Carrito y lista de deseos persistentes (Zustand + localStorage)
- 💳 Checkout con **Stripe** (modo test incluido)
- 🔐 Autenticación completa con **Clerk**
- 📝 Blog con categorías y entradas en español
- 🎨 Panel de temas con 6 paletas de color
- 📦 CMS headless con **Sanity Studio** en `/studio`
- ⚡ Rendimiento optimizado con ISR (revalidación cada 60s)
- 📱 Diseño responsive mobile-first

---

## 🧰 Stack tecnológico

| Tecnología | Uso |
|---|---|
| Next.js 15 (App Router) | Framework principal |
| React 19 | UI |
| Tailwind CSS v4 | Estilos |
| Sanity CMS | Contenido y assets |
| Clerk | Autenticación |
| Stripe | Pagos |
| Zustand | Estado global |
| TypeScript | Tipado |
| Lucide React | Iconos |

---

## 🚀 Inicio rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz con las siguientes variables:

```env
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=tu_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-03-20
SANITY_API_TOKEN=tu_token
SANITY_API_READ_TOKEN=tu_token_de_lectura

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Correo (boletín)
EMAIL_ENCRYPTION_KEY=genera_una_clave
# Correo de salida por variables (opcional; el panel también lo configura en Ajustes → Correo)
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=tu_correo
# SMTP_PASSWORD=tu_contraseña_de_aplicación
# SMTP_PORT=587
# SMTP_FROM_EMAIL=tu_correo

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Genera `EMAIL_ENCRYPTION_KEY` con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. No la cambies después de salir en vivo: la contraseña SMTP guardada se vuelve ilegible y todos los enlaces de baja ya enviados dejan de funcionar.

### 3. Poblar la base de datos

```bash
node scripts/seed.mjs
```

Esto sube automáticamente imágenes desde `images/` a Sanity y crea:
- 5 marcas con imagen
- 8 categorías de productos
- 28 productos con imagen
- 8 entradas de blog con categorías

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📁 Estructura del proyecto

```
├── app/
│   ├── (client)/          # Rutas del frontend
│   │   ├── page.tsx       # Home
│   │   ├── shop/          # Tienda con filtros
│   │   ├── product/[slug] # Detalle de producto
│   │   ├── cart/          # Carrito
│   │   ├── wishlist/      # Lista de deseos
│   │   ├── orders/        # Mis pedidos
│   │   ├── blog/          # Blog
│   │   └── deal/          # Ofertas
│   └── studio/            # Sanity Studio
├── components/            # Componentes reutilizables
├── sanity/
│   ├── queries/           # Queries GROQ
│   └── schemaTypes/       # Schemas de contenido
├── scripts/
│   └── seed.mjs           # Script de datos iniciales
├── images/                # Imágenes locales para el seed
└── store.ts               # Estado global (Zustand)
```

---

## 🎨 Temas de color

El panel flotante (esquina inferior derecha) permite cambiar entre 6 temas:

| Tema | Color principal |
|---|---|
| Esmeralda | Verde (por defecto) |
| Océano | Azul |
| Violeta | Púrpura |
| Carmesí | Rojo oscuro |
| Rosa | Rosa |
| Pizarra | Gris oscuro |

---

## 🏗️ Build de producción

```bash
npm run build
npm run start
```

---

## 🌐 Deploy en Vercel

Cada cliente tiene su propia tienda: proyecto de Vercel, dominio, Clerk, Sanity y Stripe. Sigue la guía [docs/despliegue-cliente.md](docs/despliegue-cliente.md).

Para revisar un archivo de variables: `npm run check:env -- .env.cliente` (agrega `--online` para probar las claves).
