import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";


export default withAuth(
  async function middleware(req: Request & {kindeAuth: {user: unknown, token: string}}) {
    console.log("look at me", req.kindeAuth);
  },
  {
    isReturnToCurrentPage: true,
    loginPage: "/login"
  }
);

export const config = {
  matcher: ["/admin"],
};
