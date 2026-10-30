import { NextResponse } from "next/server";
import { loadPaperPortfolio } from "../../../../lib/alpaca/server";
import type { AlpacaPortfolioResult } from "../../../../lib/alpaca/types";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

/** Local-development only until user login and authorization are implemented.
 * Never expose private paper holdings on an anonymously deployed website. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    const result: AlpacaPortfolioResult = {
      status: "error",
      code: "disabled",
      message: "Account access is disabled in production until authentication is implemented.",
    };
    return NextResponse.json(result, { status: 403, headers: privateHeaders });
  }
  const result = await loadPaperPortfolio();
  return NextResponse.json(result, {
    status: result.status === "error" ? 502 : 200,
    headers: privateHeaders,
  });
}
