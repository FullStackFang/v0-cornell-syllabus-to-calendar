import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/",
  },
})

export const config = {
  matcher: ["/dashboard/:path*", "/review/:path*", "/chat/:path*", "/success/:path*"],
}
