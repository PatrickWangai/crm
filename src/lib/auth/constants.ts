// Standalone constant (no server-only / prisma imports) so it is safe to
// import from Edge middleware as well as Node-runtime server code.
export const SESSION_COOKIE = "mw_session";
