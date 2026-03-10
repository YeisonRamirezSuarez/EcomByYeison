import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Poppins } from "next/font/google";
import ThemeInitializer from "@/components/ThemeInitializer";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const themeBootScript = `
    (() => {
      try {
        const raw = window.localStorage.getItem('cart-store');
        const parsed = raw ? JSON.parse(raw) : null;
        const themeName = parsed?.state?.themeName || 'emerald';

        const themes = {
          emerald: {
            primary: '#063c28', primaryBtn: '#063d29', light: '#3b9c3c', accent: '#fb6c08',
            accentLight: '#fca99b', bg: '#fcf0e4', bgAlt: '#f6f6f6', dealBg: '#f1f3f8'
          },
          ocean: {
            primary: '#0c2d57', primaryBtn: '#0c2d57', light: '#1d6fb8', accent: '#0ea5e9',
            accentLight: '#bae6fd', bg: '#eff6ff', bgAlt: '#f0f9ff', dealBg: '#e0f2fe'
          },
          violet: {
            primary: '#3b0764', primaryBtn: '#3b0764', light: '#7c3aed', accent: '#a855f7',
            accentLight: '#e9d5ff', bg: '#faf5ff', bgAlt: '#f5f3ff', dealBg: '#ede9fe'
          },
          crimson: {
            primary: '#7f1d1d', primaryBtn: '#7f1d1d', light: '#c53030', accent: '#ea580c',
            accentLight: '#fed7aa', bg: '#fff7ed', bgAlt: '#fef3c7', dealBg: '#ffedd5'
          },
          rose: {
            primary: '#881337', primaryBtn: '#881337', light: '#e11d48', accent: '#fb923c',
            accentLight: '#fecaca', bg: '#fff1f2', bgAlt: '#fdf2f8', dealBg: '#ffe4e6'
          },
          slate: {
            primary: '#1e293b', primaryBtn: '#1e293b', light: '#475569', accent: '#64748b',
            accentLight: '#cbd5e1', bg: '#f8fafc', bgAlt: '#f1f5f9', dealBg: '#e2e8f0'
          }
        };

        const theme = themes[themeName] || themes.emerald;
        const root = document.documentElement;
        root.style.setProperty('--color-shop_dark_green', theme.primary);
        root.style.setProperty('--color-shop_btn_dark_green', theme.primaryBtn);
        root.style.setProperty('--color-shop_light_green', theme.light);
        root.style.setProperty('--color-shop_orange', theme.accent);
        root.style.setProperty('--color-lightOrange', theme.accentLight);
        root.style.setProperty('--color-shop_light_pink', theme.bg);
        root.style.setProperty('--color-shop_light_bg', theme.bgAlt);
        root.style.setProperty('--color-deal-bg', theme.dealBg);
      } catch (e) {
        // no-op: keep default theme
      }
    })();
  `;

  return (
    <html lang="es" className={poppins.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-poppins antialiased overflow-x-hidden">
        <ThemeInitializer />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111827",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
              padding: "12px 16px",
            },
          }}
        />
      </body>
    </html>
  );
};
export default RootLayout;
