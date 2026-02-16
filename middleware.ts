// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Protege rutas de app y api (excluye estáticos)
    "/((?!_next|.*\\..*).*)",
    "/api/(.*)",
  ],
};
