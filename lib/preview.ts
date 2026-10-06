// A request asks for the appearance draft when it carries ?vista-previa=1 or is a
// navigation inside a frame (frame-ancestors 'self' means only the editor can frame the store).
// Asking is not seeing: getSiteSettings() still requires the configurar permission.
export const wantsPreview = (params: URLSearchParams, fetchDest: string | null) =>
  params.get("vista-previa") === "1" || fetchDest === "iframe";
