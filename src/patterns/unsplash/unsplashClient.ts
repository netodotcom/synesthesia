/**
 * Cliente da API Unsplash (browser-side). Usa autenticação Client-ID — o
 * "Access Key" é público por design (não requer login do usuário). A chave é
 * fornecida pelo usuário na UI e guardada em localStorage; nunca vai ao repo.
 *
 * Docs: https://unsplash.com/documentation
 */
import type { UnsplashPhoto, UnsplashUser } from "@/patterns/unsplash/types";

const API = "https://api.unsplash.com";

/** Nome do app usado nos parâmetros UTM de atribuição (Guidelines). */
export const APP_NAME = "synesthesia";

/** Perfil padrão pedido pelo usuário. */
export const DEFAULT_PROFILE = "resourcedatabase";

/** Anexa os UTM de referral exigidos pelas diretrizes de atribuição. */
export function withUtm(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=${APP_NAME}&utm_medium=referral`;
}

function authHeaders(accessKey: string): HeadersInit {
  return { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" };
}

async function getJson<T>(path: string, accessKey: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: authHeaders(accessKey) });
  } catch {
    throw new Error("Falha de rede ao falar com a Unsplash. Verifique a conexão.");
  }
  if (res.status === 401) throw new Error("Chave Unsplash inválida (401). Confira o Access Key.");
  if (res.status === 403) throw new Error("Limite de requisições da Unsplash atingido (403). Tente mais tarde.");
  if (res.status === 404) throw new Error("Perfil não encontrado na Unsplash (404).");
  if (!res.ok) throw new Error(`Unsplash respondeu ${res.status}.`);
  return (await res.json()) as T;
}

/** Busca perfis por nome/usuário. */
export async function searchUsers(
  query: string,
  accessKey: string,
  perPage = 12,
): Promise<UnsplashUser[]> {
  const q = encodeURIComponent(query.trim());
  const data = await getJson<{ results: UnsplashUser[] }>(
    `/search/users?query=${q}&per_page=${perPage}`,
    accessKey,
  );
  return data.results ?? [];
}

/** Lista as fotos de um perfil, paginadas (feed do pool). */
export async function getUserPhotos(
  username: string,
  accessKey: string,
  perPage = 5,
  page = 1,
  orderBy: "latest" | "popular" | "views" | "downloads" = "latest",
): Promise<UnsplashPhoto[]> {
  const u = encodeURIComponent(username.replace(/^@/, "").trim());
  return getJson<UnsplashPhoto[]>(
    `/users/${u}/photos?per_page=${perPage}&page=${page}&order_by=${orderBy}`,
    accessKey,
  );
}

/**
 * Fotos aleatórias de toda a Unsplash — usado pelo "Fetch More" como fonte de
 * imagens diferentes quando o perfil ativo esgota as páginas.
 */
export async function getRandomPhotos(
  accessKey: string,
  count = 5,
): Promise<UnsplashPhoto[]> {
  const data = await getJson<UnsplashPhoto[] | UnsplashPhoto>(
    `/photos/random?count=${count}`,
    accessKey,
  );
  return Array.isArray(data) ? data : [data];
}

/**
 * Dispara o tracking de download exigido pelas diretrizes quando uma foto é
 * "usada" (aqui: selecionada para o padrão). Best-effort — nunca quebra o fluxo.
 */
export function triggerDownload(downloadLocation: string, accessKey: string): void {
  if (!downloadLocation) return;
  void fetch(downloadLocation, { headers: authHeaders(accessKey) }).catch(() => {});
}
