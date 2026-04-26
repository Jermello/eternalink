import QRCode from "qrcode";

import { getSiteUrl } from "@/lib/utils";

/**
 * GET /api/qr/[slug]
 *
 * Returns a PNG QR code that points to the public memorial URL. Used by the
 * admin dashboard so the operator can save the image and send it to whoever
 * is engraving the plaque.
 *
 * `?size=NNN` (96..1024, default 512) controls the rendered size.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/qr/[slug]">
) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9\u0590-\u05FF-]{3,80}$/i.test(slug)) {
    return new Response("Invalid slug", { status: 400 });
  }

  const url = new URL(request.url);
  const sizeParam = Number(url.searchParams.get("size") ?? "512");
  const size = Number.isFinite(sizeParam)
    ? Math.max(96, Math.min(1024, Math.floor(sizeParam)))
    : 512;

  const target = `${getSiteUrl()}/m/${slug}`;

  const png = await QRCode.toBuffer(target, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "Q",
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  // Cast to BodyInit-compatible Uint8Array view to satisfy the Response type.
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Disposition": `inline; filename="qr-${slug}.png"`,
    },
  });
}
