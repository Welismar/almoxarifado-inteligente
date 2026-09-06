type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseRow = Record<string, unknown>;

function getConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function supabaseRest<T extends SupabaseRow>(
  table: string,
  options: {
    select?: string;
    filters?: Record<string, string>;
    accessToken?: string;
  } = {},
): Promise<T[]> {
  const config = getConfig();
  const params = new URLSearchParams();
  params.set("select", options.select ?? "*");

  for (const [key, value] of Object.entries(options.filters ?? {})) {
    params.set(key, value);
  }

  const response = await fetch(`${config.url}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${options.accessToken ?? config.anonKey}`,
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Supabase REST retornou ${response.status} ao consultar ${table}.`);
  }

  return (await response.json()) as T[];
}
