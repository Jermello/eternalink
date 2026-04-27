import "./globals.css";

/**
 * Root layout. With next-intl + App Router, we keep this as a transparent
 * pass-through so the *real* <html> + <body> can live inside
 * `app/[locale]/layout.tsx` where we know the locale (and therefore can set
 * `lang` and `dir` correctly).
 *
 * Next.js still requires a top-level layout to exist, hence this file.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
