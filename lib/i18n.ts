export type Locale = "es" | "en";

type Messages = {
  themePanelTitle: string;
  themePanelSubtitle: string;
  themePanelAutosave: string;
  languageLabel: string;
  authSignInTitle: string;
  authSignUpTitle: string;
  authSignInSubtitle: string;
  authSignUpSubtitle: string;
  authSuccessTitle: string;
  authSuccessBody: string;
  authNoAccount: string;
  authRegister: string;
  authHaveAccount: string;
  authLogin: string;
  navHome: string;
  navShop: string;
  navBlog: string;
  navHotDeal: string;
  footerQuickLinks: string;
  footerCategories: string;
  footerNewsletter: string;
  footerNewsletterDesc: string;
  footerEmailPlaceholder: string;
  footerSubscribe: string;
  footerCopyright: string;
  footerVisitUs: string;
  footerCallUs: string;
  footerSchedule: string;
  footerWriteUs: string;
  footerScheduleValue: string;
  categoryMobiles: string;
  categoryAppliances: string;
  categorySmartphones: string;
  categoryAirConditioners: string;
  categoryWashingMachine: string;
  categoryKitchenAppliances: string;
  categoryGadgetAccessories: string;
  typeGadget: string;
  typeRefrigerators: string;
  typeOthers: string;
  noAccessWelcome: string;
  noAccessDetails: string;
  noAccessSignIn: string;
  noAccessNoAccount: string;
  noAccessCreateAccount: string;
  headerFreeShipping: string;
  headerSecurePurchase: string;
  headerSupport: string;
  headerWelcome: string;
  headerMyOrders: string;
  cartTitle: string;
  cartConfirmReset: string;
  cartResetSuccess: string;
  cartVariant: string;
  cartStatus: string;
  cartAddToFavorite: string;
  cartDeleteProduct: string;
  cartDeleteSuccess: string;
  cartResetButton: string;
  cartOrderSummary: string;
  cartSubtotal: string;
  cartDiscount: string;
  cartTotal: string;
  cartPleaseWait: string;
  cartProceedCheckout: string;
  cartDeliveryAddress: string;
  cartAddNewAddress: string;
  addToCartAdded: string;
  addToCartCannotMore: string;
  addToCartQuantity: string;
  addToCartSubtotal: string;
  addToCartOutOfStock: string;
  addToCartButton: string;
  notFoundTitle: string;
  notFoundDescription: string;
  notFoundGoHome: string;
  notFoundHelp: string;
  notFoundNeedHelp: string;
  notFoundHelpSection: string;
  notFoundContactUs: string;
  emptyCartTitle: string;
  emptyCartDescription: string;
  emptyCartDiscover: string;
  noProductTitle: string;
  noProductDescription: string;
  noProductRestocking: string;
  noProductTryLater: string;
  successTitle: string;
  successBody: string;
  successOrderNumber: string;
  successHome: string;
  successOrders: string;
  successShop: string;
  successLoading: string;
  productInStock: string;
  productOutOfStock: string;
  productCompareColor: string;
  productAskQuestion: string;
  productDeliveryReturn: string;
  productShare: string;
  productFreeDelivery: string;
  productPostalCode: string;
  productReturnDelivery: string;
  productReturnPolicy: string;
  productDetails: string;
  blogTitle: string;
  blogSubtitle: string;
  blogReadMore: string;
  blogLabel: string;
  blogBack: string;
  blogCategories: string;
  blogLatest: string;
  shopHeadline: string;
  shopResetFilters: string;
  shopLoadingProducts: string;
  shopProductCategories: string;
  shopBrands: string;
  shopPrice: string;
  shopResetSelection: string;
  shopPriceUnder100: string;
  shopPrice100To200: string;
  shopPrice200To300: string;
  shopPrice300To500: string;
  shopPriceOver500: string;
  dealWeekTitle: string;
  categoryProductsBy: string;
  footerBrandDescription: string;
  footerNewsletterNote: string;
  footerPrivacy: string;
  footerTerms: string;
  footerHelpCenter: string;
  wishlistTitle: string;
  wishlistEmpty: string;
  wishlistEmptyDesc: string;
  wishlistContinueShopping: string;
  wishlistLoadMore: string;
  wishlistLoadLess: string;
  wishlistReset: string;
  wishlistConfirmReset: string;
  wishlistResetSuccess: string;
  wishlistRemoveSuccess: string;
  wishlistTableImage: string;
  wishlistTableCategory: string;
  wishlistTableType: string;
  wishlistTableStatus: string;
  wishlistTablePrice: string;
  wishlistTableAction: string;
  wishlistInStock: string;
  wishlistOutOfStock: string;
  ordersTitle: string;
  ordersOrderNumber: string;
  ordersDate: string;
  ordersCustomer: string;
  ordersEmail: string;
  ordersTotal: string;
  ordersStatus: string;
  ordersInvoice: string;
  ordersAction: string;
  ordersNotFound: string;
  ordersNotFoundDesc: string;
  ordersBrowseProducts: string;
  ordersPaid: string;
  ordersPending: string;
  ordersViewDetails: string;
  ordersActionNotAvailable: string;
  ordersDetailsTitle: string;
  ordersDownloadInvoice: string;
  ordersProduct: string;
  ordersQuantity: string;
  ordersPrice: string;
  ordersDiscount: string;
  ordersSubtotal: string;
};

export const MESSAGES: Record<Locale, Messages> = {
  es: {
    themePanelTitle: "Personalizar tema",
    themePanelSubtitle: "Selecciona tu color favorito",
    themePanelAutosave: "Tu preferencia se guarda automáticamente",
    languageLabel: "Idioma",
    authSignInTitle: "Inicia sesión",
    authSignUpTitle: "Regístrate",
    authSignInSubtitle: "Accede a tu cuenta de Ecom by Yeison",
    authSignUpSubtitle: "Crea tu cuenta en Ecom by Yeison",
    authSuccessTitle: "Inicio exitoso",
    authSuccessBody: "Bienvenido de nuevo. Estamos actualizando tu sesión...",
    authNoAccount: "¿No tienes cuenta?",
    authRegister: "Regístrate",
    authHaveAccount: "¿Ya tienes cuenta?",
    authLogin: "Inicia sesión",
    navHome: "Inicio",
    navShop: "Tienda",
    navBlog: "Blog",
    navHotDeal: "Ofertas",
    footerQuickLinks: "Enlaces rápidos",
    footerCategories: "Categorías",
    footerNewsletter: "Boletín",
    footerNewsletterDesc: "Suscríbete y recibe ofertas exclusivas y las últimas novedades",
    footerEmailPlaceholder: "Tu correo electrónico",
    footerSubscribe: "Suscribirme",
    footerCopyright: "Todos los derechos reservados.",
    footerVisitUs: "Visítanos",
    footerCallUs: "Llámanos",
    footerSchedule: "Horario de atencion",
    footerWriteUs: "Escríbenos",
    footerScheduleValue: "Lun - Sáb: 9:00 AM - 7:00 PM",
    categoryMobiles: "Móviles",
    categoryAppliances: "Electrodomésticos",
    categorySmartphones: "Smartphones",
    categoryAirConditioners: "Aires acondicionados",
    categoryWashingMachine: "Lavadoras",
    categoryKitchenAppliances: "Electro de cocina",
    categoryGadgetAccessories: "Accesorios",
    typeGadget: "Gadgets",
    typeRefrigerators: "Refrigeradores",
    typeOthers: "Otros",
    noAccessWelcome: "¡Bienvenido de nuevo!",
    noAccessDetails: "Inicia sesión para ver tu carrito y finalizar tu compra. ¡No pierdas tus productos favoritos!",
    noAccessSignIn: "Iniciar sesión",
    noAccessNoAccount: "¿No tienes cuenta?",
    noAccessCreateAccount: "Crear cuenta",
    headerFreeShipping: "Envío gratis en pedidos superiores a $99",
    headerSecurePurchase: "Compra 100% segura",
    headerSupport: "Soporte 24/7",
    headerWelcome: "Bienvenido a Ecom by Yeison",
    headerMyOrders: "Mis pedidos",
    cartTitle: "Carrito de compras",
    cartConfirmReset: "¿Seguro que deseas vaciar tu carrito?",
    cartResetSuccess: "¡Carrito reiniciado con éxito!",
    cartVariant: "Variante",
    cartStatus: "Estado",
    cartAddToFavorite: "Agregar a favoritos",
    cartDeleteProduct: "Eliminar producto",
    cartDeleteSuccess: "¡Producto eliminado correctamente!",
    cartResetButton: "Vaciar carrito",
    cartOrderSummary: "Resumen del pedido",
    cartSubtotal: "Subtotal",
    cartDiscount: "Descuento",
    cartTotal: "Total",
    cartPleaseWait: "Por favor espera...",
    cartProceedCheckout: "Proceder al pago",
    cartDeliveryAddress: "Dirección de entrega",
    cartAddNewAddress: "Agregar nueva dirección",
    addToCartAdded: "agregado correctamente",
    addToCartCannotMore: "No puedes agregar más del stock disponible",
    addToCartQuantity: "Cantidad",
    addToCartSubtotal: "Subtotal",
    addToCartOutOfStock: "Sin stock",
    addToCartButton: "Agregar al carrito",
    notFoundTitle: "¿Buscas algo?",
    notFoundDescription: "Lo sentimos. La dirección web que ingresaste no corresponde a una página funcional en nuestro sitio.",
    notFoundGoHome: "Ir a la página principal de Ecom by Yeison",
    notFoundHelp: "Ayuda",
    notFoundNeedHelp: "¿Necesitas ayuda? Visita la sección",
    notFoundHelpSection: "Ayuda",
    notFoundContactUs: "contáctanos",
    emptyCartTitle: "Tu carrito está vacío",
    emptyCartDescription: "Parece que aún no has agregado productos a tu carrito. ¡Vamos a cambiar eso y encontrar algo increíble para ti!",
    emptyCartDiscover: "Descubrir productos",
    noProductTitle: "No hay productos disponibles",
    noProductDescription: "Lo sentimos, no hay productos que coincidan con",
    noProductRestocking: "Estamos reabasteciendo pronto",
    noProductTryLater: "Vuelve más tarde o explora otras categorías.",
    successTitle: "¡Pedido confirmado!",
    successBody: "Gracias por tu compra. Estamos procesando tu pedido y lo enviaremos pronto. Recibirás un correo de confirmación con los detalles en breve.",
    successOrderNumber: "Número de pedido",
    successHome: "Inicio",
    successOrders: "Pedidos",
    successShop: "Tienda",
    successLoading: "Cargando...",
    productInStock: "En stock",
    productOutOfStock: "Sin stock",
    productCompareColor: "Comparar color",
    productAskQuestion: "Hacer una pregunta",
    productDeliveryReturn: "Envío y devoluciones",
    productShare: "Compartir",
    productFreeDelivery: "Envío gratis",
    productPostalCode: "Ingresa tu código postal para ver disponibilidad de entrega.",
    productReturnDelivery: "Devolución de entrega",
    productReturnPolicy: "Devoluciones gratis por 30 días. Detalles",
    productDetails: "Detalles",
    blogTitle: "Blog",
    blogSubtitle: "Noticias, reseñas y consejos del mundo tech",
    blogReadMore: "Leer más",
    blogLabel: "Blog",
    blogBack: "Volver al blog",
    blogCategories: "Categorías del blog",
    blogLatest: "Últimos blogs",
    shopHeadline: "Encuentra los productos que necesitas",
    shopResetFilters: "Restablecer filtros",
    shopLoadingProducts: "Cargando productos...",
    shopProductCategories: "Categorías de productos",
    shopBrands: "Marcas",
    shopPrice: "Precio",
    shopResetSelection: "Restablecer selección",
    shopPriceUnder100: "Menos de $100",
    shopPrice100To200: "$100 - $200",
    shopPrice200To300: "$200 - $300",
    shopPrice300To500: "$300 - $500",
    shopPriceOver500: "Más de $500",
    dealWeekTitle: "Ofertas de la semana",
    categoryProductsBy: "Productos por categoría",
    footerBrandDescription: "Ecom by Yeison es tu destino de tecnología premium. Descubre gadgets, electrónica y accesorios seleccionados con calidad y buen precio.",
    footerNewsletterNote: "Sin spam. Solo lanzamientos, ofertas y novedades relevantes.",
    footerPrivacy: "Privacidad",
    footerTerms: "Términos",
    footerHelpCenter: "Centro de ayuda",
    wishlistTitle: "Mi lista de deseos",
    wishlistEmpty: "Tu lista de deseos está vacía",
    wishlistEmptyDesc: "Los productos que agregues a tu lista de deseos aparecerán aquí",
    wishlistContinueShopping: "Seguir comprando",
    wishlistLoadMore: "Cargar más",
    wishlistLoadLess: "Cargar menos",
    wishlistReset: "Vaciar lista",
    wishlistConfirmReset: "¿Seguro que deseas vaciar tu lista de deseos?",
    wishlistResetSuccess: "¡Lista de deseos vaciada!",
    wishlistRemoveSuccess: "¡Producto removido de la lista!",
    wishlistTableImage: "Imagen",
    wishlistTableCategory: "Categoría",
    wishlistTableType: "Tipo",
    wishlistTableStatus: "Estado",
    wishlistTablePrice: "Precio",
    wishlistTableAction: "Acción",
    wishlistInStock: "En stock",
    wishlistOutOfStock: "Agotado",
    ordersTitle: "Mis órdenes",
    ordersOrderNumber: "Número de orden",
    ordersDate: "Fecha",
    ordersCustomer: "Cliente",
    ordersEmail: "Correo",
    ordersTotal: "Total",
    ordersStatus: "Estado",
    ordersInvoice: "Número de factura",
    ordersAction: "Acción",
    ordersNotFound: "No hay órdenes",
    ordersNotFoundDesc: "Parece que aún no has realizado ninguna compra. ¡Comienza a comprar para ver tus órdenes aquí!",
    ordersBrowseProducts: "Ver productos",
    ordersPaid: "Pagado",
    ordersPending: "Pendiente",
    ordersViewDetails: "Haz clic para ver los detalles de la orden",
    ordersActionNotAvailable: "Acción disponible solo para administradores",
    ordersDetailsTitle: "Detalles de la orden",
    ordersDownloadInvoice: "Descargar factura",
    ordersProduct: "Producto",
    ordersQuantity: "Cantidad",
    ordersPrice: "Precio",
    ordersDiscount: "Descuento",
    ordersSubtotal: "Subtotal",
  },
  en: {
    themePanelTitle: "Customize theme",
    themePanelSubtitle: "Pick your favorite color",
    themePanelAutosave: "Your preference is saved automatically",
    languageLabel: "Language",
    authSignInTitle: "Sign in",
    authSignUpTitle: "Sign up",
    authSignInSubtitle: "Access your Ecom by Yeison account",
    authSignUpSubtitle: "Create your Ecom by Yeison account",
    authSuccessTitle: "Signed in successfully",
    authSuccessBody: "Welcome back. We are updating your session...",
    authNoAccount: "Don't have an account?",
    authRegister: "Sign up",
    authHaveAccount: "Already have an account?",
    authLogin: "Sign in",
    navHome: "Home",
    navShop: "Shop",
    navBlog: "Blog",
    navHotDeal: "Hot Deal",
    footerQuickLinks: "Quick Links",
    footerCategories: "Categories",
    footerNewsletter: "Newsletter",
    footerNewsletterDesc: "Subscribe and receive exclusive offers and the latest updates",
    footerEmailPlaceholder: "Your email address",
    footerSubscribe: "Subscribe",
    footerCopyright: "All rights reserved.",
    footerVisitUs: "Visit us",
    footerCallUs: "Call us",
    footerSchedule: "Business hours",
    footerWriteUs: "Write to us",
    footerScheduleValue: "Mon - Sat: 9:00 AM - 7:00 PM",
    categoryMobiles: "Mobiles",
    categoryAppliances: "Appliances",
    categorySmartphones: "Smartphones",
    categoryAirConditioners: "Air Conditioners",
    categoryWashingMachine: "Washing Machines",
    categoryKitchenAppliances: "Kitchen Appliances",
    categoryGadgetAccessories: "Gadget Accessories",
    typeGadget: "Gadget",
    typeRefrigerators: "Refrigerators",
    typeOthers: "Others",
    noAccessWelcome: "Welcome Back!",
    noAccessDetails: "Log in to view your cart and checkout. Don't miss your favorite products!",
    noAccessSignIn: "Sign in",
    noAccessNoAccount: "Don't have an account?",
    noAccessCreateAccount: "Create an account",
    headerFreeShipping: "Free shipping on orders over $99",
    headerSecurePurchase: "100% secure purchase",
    headerSupport: "24/7 support",
    headerWelcome: "Welcome to Ecom by Yeison",
    headerMyOrders: "My orders",
    cartTitle: "Shopping Cart",
    cartConfirmReset: "Are you sure you want to reset your cart?",
    cartResetSuccess: "Cart reset successfully!",
    cartVariant: "Variant",
    cartStatus: "Status",
    cartAddToFavorite: "Add to Favorite",
    cartDeleteProduct: "Delete product",
    cartDeleteSuccess: "Product deleted successfully!",
    cartResetButton: "Reset Cart",
    cartOrderSummary: "Order Summary",
    cartSubtotal: "Subtotal",
    cartDiscount: "Discount",
    cartTotal: "Total",
    cartPleaseWait: "Please wait...",
    cartProceedCheckout: "Proceed to Checkout",
    cartDeliveryAddress: "Delivery Address",
    cartAddNewAddress: "Add New Address",
    addToCartAdded: "added successfully",
    addToCartCannotMore: "You cannot add more than available stock",
    addToCartQuantity: "Quantity",
    addToCartSubtotal: "Subtotal",
    addToCartOutOfStock: "Out of Stock",
    addToCartButton: "Add to Cart",
    notFoundTitle: "Looking for something?",
    notFoundDescription: "We're sorry. The web address you entered is not a functioning page on our site.",
    notFoundGoHome: "Go to Ecom by Yeison's home page",
    notFoundHelp: "Help",
    notFoundNeedHelp: "Need help? Visit the",
    notFoundHelpSection: "Help section",
    notFoundContactUs: "contact us",
    emptyCartTitle: "Your cart is feeling lonely",
    emptyCartDescription: "It looks like you haven't added anything to your cart yet. Let's change that and find amazing products for you!",
    emptyCartDiscover: "Discover Products",
    noProductTitle: "No Product Available",
    noProductDescription: "We're sorry, but there are no products matching",
    noProductRestocking: "We're restocking shortly",
    noProductTryLater: "Please check back later or explore other categories.",
    successTitle: "Order Confirmed!",
    successBody: "Thank you for your purchase. We're processing your order and will ship it soon. A confirmation email with your order details will be sent shortly.",
    successOrderNumber: "Order Number",
    successHome: "Home",
    successOrders: "Orders",
    successShop: "Shop",
    successLoading: "Loading...",
    productInStock: "In Stock",
    productOutOfStock: "Out of Stock",
    productCompareColor: "Compare color",
    productAskQuestion: "Ask a question",
    productDeliveryReturn: "Delivery & Return",
    productShare: "Share",
    productFreeDelivery: "Free Delivery",
    productPostalCode: "Enter your postal code for delivery availability.",
    productReturnDelivery: "Return Delivery",
    productReturnPolicy: "Free 30-day delivery returns. Details",
    productDetails: "Details",
    blogTitle: "Blog",
    blogSubtitle: "News, reviews, and tips from the tech world",
    blogReadMore: "Read more",
    blogLabel: "Blog",
    blogBack: "Back to blog",
    blogCategories: "Blog Categories",
    blogLatest: "Latest Blogs",
    shopHeadline: "Find the products you need",
    shopResetFilters: "Reset filters",
    shopLoadingProducts: "Loading products...",
    shopProductCategories: "Product Categories",
    shopBrands: "Brands",
    shopPrice: "Price",
    shopResetSelection: "Reset selection",
    shopPriceUnder100: "Under $100",
    shopPrice100To200: "$100 - $200",
    shopPrice200To300: "$200 - $300",
    shopPrice300To500: "$300 - $500",
    shopPriceOver500: "Over $500",
    dealWeekTitle: "Hot Deals of the Week",
    categoryProductsBy: "Products by Category",
    footerBrandDescription: "Ecom by Yeison is your premium technology destination. Discover curated gadgets, electronics, and accessories at fair prices.",
    footerNewsletterNote: "No spam. Only launches, offers, and relevant updates.",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerHelpCenter: "Help Center",
    wishlistTitle: "My Wishlist",
    wishlistEmpty: "Your wishlist is empty",
    wishlistEmptyDesc: "Items added to your wishlist will appear here",
    wishlistContinueShopping: "Continue Shopping",
    wishlistLoadMore: "Load More",
    wishlistLoadLess: "Load Less",
    wishlistReset: "Clear Wishlist",
    wishlistConfirmReset: "Are you sure you want to clear your wishlist?",
    wishlistResetSuccess: "Wishlist cleared successfully!",
    wishlistRemoveSuccess: "Product removed from wishlist!",
    wishlistTableImage: "Image",
    wishlistTableCategory: "Category",
    wishlistTableType: "Type",
    wishlistTableStatus: "Status",
    wishlistTablePrice: "Price",
    wishlistTableAction: "Action",
    wishlistInStock: "In Stock",
    wishlistOutOfStock: "Out of Stock",
    ordersTitle: "My Orders",
    ordersOrderNumber: "Order Number",
    ordersDate: "Date",
    ordersCustomer: "Customer",
    ordersEmail: "Email",
    ordersTotal: "Total",
    ordersStatus: "Status",
    ordersInvoice: "Invoice Number",
    ordersAction: "Action",
    ordersNotFound: "No orders found",
    ordersNotFoundDesc: "It looks like you haven't placed any orders yet. Start shopping to see your orders here!",
    ordersBrowseProducts: "Browse Products",
    ordersPaid: "Paid",
    ordersPending: "Pending",
    ordersViewDetails: "Click to see order details",
    ordersActionNotAvailable: "Action available for admins only",
    ordersDetailsTitle: "Order Details",
    ordersDownloadInvoice: "Download Invoice",
    ordersProduct: "Product",
    ordersQuantity: "Quantity",
    ordersPrice: "Price",
    ordersDiscount: "Discount",
    ordersSubtotal: "Subtotal",
  },
};

export function t(locale: Locale, key: keyof Messages): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES.es[key];
}
