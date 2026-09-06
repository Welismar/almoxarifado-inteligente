import { NextResponse } from "next/server";

type LoginBody = {
  email?: string;
  password?: string;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const session = (await response.json()) as AuthSession;
  const result = NextResponse.json({ authenticated: true });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: session.expires_in,
  };

  result.cookies.set("stockwise-access-token", session.access_token, cookieOptions);
  result.cookies.set("stockwise-refresh-token", session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });

  return result;
}
