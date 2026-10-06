import {
  FileText,
  FolderTree,
  LayoutDashboard,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminSection } from "@/lib/permissions";

export type NavItem = { section: AdminSection; label: string; icon: LucideIcon };

export const SECTION_PATHS: Record<AdminSection, string> = {
  inicio: "/admin",
  pedidos: "/admin/pedidos",
  productos: "/admin/productos",
  categorias: "/admin/categorias",
  marcas: "/admin/marcas",
  apariencia: "/admin/apariencia",
  paginas: "/admin/paginas",
  usuarios: "/admin/usuarios",
  ajustes: "/admin/ajustes",
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
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
      { section: "usuarios", label: "Usuarios", icon: Users },
      { section: "ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];
