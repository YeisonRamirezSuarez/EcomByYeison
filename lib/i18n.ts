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
  },
};

export function t(locale: Locale, key: keyof Messages): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES.es[key];
}
