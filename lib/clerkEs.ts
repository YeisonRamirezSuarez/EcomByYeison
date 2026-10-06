import { esES } from "@clerk/localizations";

// Texts @clerk/localizations leaves untranslated in es-ES (they fall back to English).
const missing = {
  userProfile: {
    navbar: { apiKeys: "Claves API", billing: "Facturación" },
    apiKeysPage: { title: "Claves API" },
    plansPage: { title: "Planes" },
    billingPage: {
      accountCreditsSection: { title: "Créditos de la cuenta", viewHistory: "Ver historial de créditos" },
      creditHistoryPage: { title: "Historial de créditos", tableHeader__amount: "Monto", tableHeader__date: "Fecha" },
      statementsSection: { itemCaption__payerCredit: "Crédito del saldo de la cuenta" },
      subscriptionsListSection: { overview: "Resumen" },
    },
    emailAddressPage: {
      formHint: "Deberás verificar este correo electrónico antes de agregarlo a tu cuenta.",
      enterpriseSSOLink: { formButton: "Haz clic para iniciar sesión", formSubtitle: "Completa el inicio de sesión con {{identifier}}" },
    },
    start: {
      connectedAccountsSection: { subtitle__disconnected: "Esta cuenta se ha desconectado." },
      passkeysSection: { primaryButton: "Agregar una llave de acceso" },
      web3WalletsSection: { detailsAction__nonPrimary: "Establecer como principal" },
    },
  },
};

type Tree = { [key: string]: unknown };
const merge = (base: Tree, extra: Tree): Tree =>
  Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(extra)])].map((key) => {
      const [a, b] = [base[key], extra[key]];
      const nested = a && b && typeof a === "object" && typeof b === "object";
      return [key, nested ? merge(a as Tree, b as Tree) : (b ?? a)];
    })
  );

export const clerkEs = merge(esES as Tree, missing) as typeof esES;
