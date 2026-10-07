import { DM_Sans, Inter, Lato, Montserrat, Nunito, Playfair_Display, Poppins, Raleway } from "next/font/google";

// The 8 fonts of Apariencia → Estilos, each as --font-f-<key> (see fontVar in lib/styles.ts).
// Self-hosted by Next (no request to Google per visit); preload off: the browser downloads only
// the fonts the page actually uses.
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"], variable: "--font-f-poppins", display: "swap", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-f-inter", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-f-montserrat", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-f-nunito", display: "swap", preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-f-lato", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-f-dmSans", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-f-playfair", display: "swap", preload: false });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-f-raleway", display: "swap", preload: false });

export const fontVariables = [poppins, inter, montserrat, nunito, lato, dmSans, playfair, raleway]
  .map((font) => font.variable)
  .join(" ");
