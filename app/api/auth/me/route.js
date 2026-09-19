import { NextResponse } from "next/server";
import { getSessionUser, summarizeAccess } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json(summarizeAccess(user));
}
