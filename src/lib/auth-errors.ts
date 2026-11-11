// NextAuth sends sign-in failures back to /signin?error=<code>.
// These turn the codes into plain language. Unknown codes get a generic message.
// Codes: https://next-auth.js.org/configuration/pages#sign-in-page

const MESSAGES: Record<string, string> = {
  // A password account already uses this email. We don't link accounts
  // automatically: whoever controls the Google account could otherwise take
  // over the password account.
  OAuthAccountNotLinked:
    "That email already has a Penny Effect account. Sign in with your email and password.",
  // Our signIn callback refused, e.g. Google hasn't verified the email.
  AccessDenied: "Google sign-in was refused. Use a Google account with a verified email.",
  // User cancelled on Google's page, or the OAuth exchange failed.
  OAuthCallback: "Google sign-in didn't complete. Please try again.",
  OAuthSignin: "Couldn't start Google sign-in. Please try again.",
  CredentialsSignin: "Invalid email or password.",
  SessionRequired: "Please sign in to continue.",
};

const GENERIC = "Sign-in failed. Please try again.";

/** Message to show for a `?error=` code, or null when there's no error. */
export function signInErrorMessage(code: string | string[] | undefined): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return null;
  return MESSAGES[value] ?? GENERIC;
}
