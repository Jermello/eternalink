/**
 * TEMPORARY diagnostic route. Reports which env vars are actually visible to
 * the serverless runtime, WITHOUT exposing their values. Delete this file
 * after you've debugged the deploy.
 *
 * Gated by ADMIN_PASSWORD so a random visitor can't probe your env shape:
 *   GET /api/debug-env?key=<your ADMIN_PASSWORD>
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
    return new Response("forbidden", { status: 403 });
  }

  const describe = (name: string) => {
    const v = process.env[name];
    if (v === undefined) return "UNDEFINED";
    if (v === "") return "EMPTY_STRING";
    return `SET (length=${v.length}, starts="${v.slice(0, 6)}…")`;
  };

  const report = {
    runtime: "node",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    vars: {
      NEXT_PUBLIC_SUPABASE_URL: describe("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: describe(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      ),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: describe(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      ),
      SUPABASE_SECRET_KEY: describe("SUPABASE_SECRET_KEY"),
      SUPABASE_SERVICE_ROLE_KEY: describe("SUPABASE_SERVICE_ROLE_KEY"),
      ADMIN_PASSWORD: describe("ADMIN_PASSWORD"),
      NEXT_PUBLIC_SITE_URL: describe("NEXT_PUBLIC_SITE_URL"),
    },
  };

  return Response.json(report);
}
