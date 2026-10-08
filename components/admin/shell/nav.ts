import {
  FileText,
  FolderTree,
  LayoutDashboard,
  Mail,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminText } from "@/lib/adminText";
import type { AdminSection } from "@/lib/permissions";

export type NavItem = { section: AdminSection; label: AdminText; icon: LucideIcon };

export const SECTION_PATHS: Record<AdminSection, string> = {
  inicio: "/admin",
  pedidos: "/admin/pedidos",
  productos: "/admin/productos",
  categorias: "/admin/categorias",
  marcas: "/admin/marcas",
  apariencia: "/admin/apariencia",
  paginas: "/admin/paginas",
  boletin: "/admin/boletin",
  usuarios: "/admin/usuarios",
  ajustes: "/admin/ajustes",
};

export const NAV_GROUPS: { title: AdminText; items: NavItem[] }[] = [
  {
    title: "Ventas",
    items: [
      { section: "inicio", label: "Inicio", icon: LayoutDashboard },
      { section: "pedidos", label: "Pedidos", icon: ShoppingBag },
      { section: "productos", label: "Productos", icon: Package },
      { section: "categorias", label: "Categorías", icon: FolderTree },
      { section: "marcas", label: "Marcas", icon: Tag },
    ],
  },
  {
    title: "Tienda",
    items: [
      { section: "apariencia", label: "Apariencia", icon: Palette },
      { section: "paginas", label: "Páginas", icon: FileText },
      { section: "boletin", label: "Boletín", icon: Mail },
      { section: "usuarios", label: "Usuarios", icon: Users },
      { section: "ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];
