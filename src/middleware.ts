export { default } from "next-auth/middleware";

// Only guard these routes
export const config = {
matcher: ["/dashboard/:path*"],
};
