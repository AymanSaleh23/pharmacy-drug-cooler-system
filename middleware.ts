import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const authRole = await request.cookies.get("auth-role")?.value
  const path = request.nextUrl.pathname
  const method = request.method

  // Redirect to login if not authenticated
  if (!authRole && path !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Protect admin-only routes
  if (authRole === "user") {
    // Block edit and add pages for regular users
    if (path.includes("/edit") || path.includes("/add-drug")) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Block modification API requests (POST, DELETE) for regular users
    if (path.includes("/api/") && (method === "DELETE")) {
      // Allow GET requests for all authenticated users
      if (method !== "GET") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
  }

  return NextResponse.next()
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

