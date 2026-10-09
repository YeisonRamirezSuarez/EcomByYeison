import type { Instrumentation } from "next";

// Errors no code caught (pages, route handlers, server actions) go to the error channel, if set.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { pathOnly, reportError } = await import("./lib/alerts");
  await reportError(`${request.method} ${pathOnly(request.path)} (${context.routeType})`, error);
};
