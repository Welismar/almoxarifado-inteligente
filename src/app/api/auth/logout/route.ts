import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });

  for (const name of ["stockwise-access-token", "stockwise-refresh-token"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
