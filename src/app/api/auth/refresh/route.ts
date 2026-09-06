import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("stockwise-refresh-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!refreshToken || !url || !anonKey) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = (await response.json()) as AuthSession;
  const result = NextResponse.json({ authenticated: true });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  result.cookies.set("stockwise-access-token", session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in,
  });
  result.cookies.set("stockwise-refresh-token", session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });

  return result;
}