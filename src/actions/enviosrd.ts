"use server";

interface EnviosRDClient {
  nombre: string;
  codigo: string;
  oficina: string;
  email: string | null;
  telefono: string | null;
  paquetes_count: number;
}

export async function searchEnviosRDClient(
  code: string,
): Promise<EnviosRDClient | null> {
  const baseUrl = process.env.ENVIOSRD_API_URL;
  if (!baseUrl) return null;

  const branches = ["altagracia", "independencia", "salcedo"];

  const results = await Promise.all(
    branches.map((branch) =>
      fetch(`${baseUrl}/api/clients/search?q=${code}&branch=${branch}`)
        .then((r) => r.json() as Promise<EnviosRDClient[]>)
        .catch(() => [] as EnviosRDClient[]),
    ),
  );

  for (const clients of results) {
    const match = clients.find((c) => c.codigo === code);
    if (match) return match;
  }

  return null;
}
