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
  return (
    <html lang="es" className={poppins.variable}>
      <body className="font-poppins antialiased">
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
