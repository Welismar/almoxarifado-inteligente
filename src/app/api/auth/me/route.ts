import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/permissions";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken || !url || !anonKey) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const profile = await getProfile(url.replace(/\/$/, ""), anonKey, accessToken);
  if (!profile) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json(profile);
}
