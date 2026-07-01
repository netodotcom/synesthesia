"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_PROFILE,
  getRandomPhotos,
  getUserPhotos,
  searchUsers,
  triggerDownload,
} from "@/patterns/unsplash/unsplashClient";
import type { UnsplashPhoto, UnsplashUser } from "@/patterns/unsplash/types";
import type { PoolImage } from "@/textures/types";

const SK_KEY = "synesthesia.unsplash.key";
const SK_ITEMS = "synesthesia.pool.unsplashItems";
const SK_SEL = "synesthesia.pool.selection";
const SK_PROFILE = "synesthesia.unsplash.profile";

const ENV_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ?? "";
const PER_PAGE = 5;
const ACCEPTED = /\.(png|jpe?g)$/i;

function unsplashToPool(p: UnsplashPhoto): PoolImage {
  return {
    id: `u_${p.id}`,
    kind: "unsplash",
    src: p.urls.regular,
    thumb: p.urls.thumb,
    label: p.user.name,
    authorName: p.user.name,
    authorLink: p.user.links.html,
    photoLink: p.links.html,
    downloadLocation: p.links.download_location,
  };
}

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage cheio/negado — só não persiste */
  }
}

export interface UseTexturePool {
  accessKey: string;
  hasKey: boolean;
  query: string;
  profiles: UnsplashUser[];
  activeUsername: string;
  items: PoolImage[];
  selectedIds: string[];
  loading: boolean;
  error: string | null;
  setAccessKey: (key: string) => void;
  setQuery: (q: string) => void;
  searchProfiles: () => Promise<void>;
  loadProfile: (username: string) => Promise<void>;
  fetchMore: () => Promise<void>;
  addUploads: (files: FileList | File[]) => void;
  removeItem: (id: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

/**
 * Gerencia o POOL de texturas (Unsplash + uploads) e a seleção que entra no
 * pipeline. Só metadados aqui (PoolImage[]); as `THREE.Texture` são carregadas
 * pelo TexturePool no DeckShell. Persiste chave, itens da Unsplash e seleção —
 * uploads (object URLs) não persistem entre reloads por natureza.
 */
export function useTexturePool(): UseTexturePool {
  const [accessKey, setAccessKeyState] = useState(ENV_KEY);
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<UnsplashUser[]>([]);
  const [activeUsername, setActiveUsername] = useState(DEFAULT_PROFILE);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PoolImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Espelha os itens num ref para revogar object URLs de uploads no unmount.
  const itemsRef = useRef<PoolImage[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => {
      for (const it of itemsRef.current) {
        if (it.kind === "upload") URL.revokeObjectURL(it.src);
      }
    },
    [],
  );

  // Hidrata do storage depois de montar (evita mismatch de hidratação do SSR).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const k = readLS(SK_KEY);
    if (k) setAccessKeyState(k);
    const p = readLS(SK_PROFILE);
    if (p) setActiveUsername(p);
    const rawItems = readLS(SK_ITEMS);
    if (rawItems) {
      try {
        const parsed = JSON.parse(rawItems) as PoolImage[];
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && i.kind === "unsplash"));
      } catch {
        /* ignora itens corrompidos */
      }
    }
    const rawSel = readLS(SK_SEL);
    if (rawSel) {
      try {
        const parsed = JSON.parse(rawSel) as string[];
        if (Array.isArray(parsed)) setSelectedIds(parsed);
      } catch {
        /* ignora seleção corrompida */
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persiste só os itens da Unsplash (uploads morrem com o object URL no reload).
  const persistItems = useCallback((next: PoolImage[]) => {
    writeLS(SK_ITEMS, JSON.stringify(next.filter((i) => i.kind === "unsplash")));
  }, []);
  const persistSelection = useCallback((next: string[]) => {
    writeLS(SK_SEL, JSON.stringify(next));
  }, []);

  const setAccessKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setAccessKeyState(trimmed);
    writeLS(SK_KEY, trimmed);
  }, []);

  /** Insere fotos novas no pool, sem duplicar (por id). */
  const mergePhotos = useCallback(
    (photos: UnsplashPhoto[], opts: { autoSelectFirst?: boolean } = {}) => {
      setItems((cur) => {
        const known = new Set(cur.map((i) => i.id));
        const fresh = photos.map(unsplashToPool).filter((i) => !known.has(i.id));
        const next = [...cur, ...fresh];
        persistItems(next);
        if (opts.autoSelectFirst && fresh.length > 0) {
          setSelectedIds((sel) => {
            if (sel.length > 0) return sel;
            const first = [fresh[0].id];
            persistSelection(first);
            if (fresh[0].downloadLocation) triggerDownload(fresh[0].downloadLocation, accessKey);
            return first;
          });
        }
        return next;
      });
    },
    [accessKey, persistItems, persistSelection],
  );

  const loadProfile = useCallback(
    async (username: string) => {
      if (!accessKey) {
        setError("Informe seu Access Key da Unsplash para carregar imagens.");
        return;
      }
      const clean = username.replace(/^@/, "").trim();
      if (!clean) return;
      setLoading(true);
      setError(null);
      try {
        const photos = await getUserPhotos(clean, accessKey, PER_PAGE, 1);
        setActiveUsername(clean);
        setPage(1);
        writeLS(SK_PROFILE, clean);
        // Substitui os itens Unsplash pelo novo perfil, mantém uploads/seleção.
        setItems((cur) => {
          const uploads = cur.filter((i) => i.kind === "upload");
          const next = [...uploads, ...photos.map(unsplashToPool)];
          persistItems(next);
          return next;
        });
        if (photos.length > 0) {
          setSelectedIds((sel) => {
            if (sel.length > 0) return sel;
            const first = [`u_${photos[0].id}`];
            persistSelection(first);
            if (photos[0].links.download_location)
              triggerDownload(photos[0].links.download_location, accessKey);
            return first;
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar o perfil.");
      } finally {
        setLoading(false);
      }
    },
    [accessKey, persistItems, persistSelection],
  );

  const fetchMore = useCallback(async () => {
    if (!accessKey) {
      setError("Informe seu Access Key da Unsplash para buscar mais imagens.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nextPage = page + 1;
      let photos = await getUserPhotos(activeUsername, accessKey, PER_PAGE, nextPage);
      if (photos.length > 0) {
        setPage(nextPage);
      } else {
        // Perfil esgotado → completa com fotos aleatórias da Unsplash.
        photos = await getRandomPhotos(accessKey, PER_PAGE);
      }
      mergePhotos(photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar mais imagens.");
    } finally {
      setLoading(false);
    }
  }, [accessKey, activeUsername, page, mergePhotos]);

  const searchProfiles = useCallback(async () => {
    if (!accessKey) {
      setError("Informe seu Access Key da Unsplash para pesquisar perfis.");
      return;
    }
    if (!query.trim()) {
      setProfiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setProfiles(await searchUsers(query, accessKey));
    } catch (err) {
      setProfiles([]);
      setError(err instanceof Error ? err.message : "Falha na busca de perfis.");
    } finally {
      setLoading(false);
    }
  }, [accessKey, query]);

  const addUploads = useCallback(
    (files: FileList | File[]) => {
      const accepted = Array.from(files).filter((f) => ACCEPTED.test(f.name) || f.type.startsWith("image/"));
      if (accepted.length === 0) return;
      const fresh: PoolImage[] = accepted.map((file) => {
        const url = URL.createObjectURL(file);
        return { id: `up_${crypto.randomUUID()}`, kind: "upload", src: url, thumb: url, label: file.name };
      });
      setItems((cur) => [...cur, ...fresh]);
      // Uploads acabados de injetar entram na seleção (uso imediato).
      setSelectedIds((sel) => {
        const next = [...sel, ...fresh.map((f) => f.id)];
        persistSelection(next);
        return next;
      });
    },
    [persistSelection],
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((cur) => {
        const target = cur.find((i) => i.id === id);
        if (target?.kind === "upload") URL.revokeObjectURL(target.src);
        const next = cur.filter((i) => i.id !== id);
        persistItems(next);
        return next;
      });
      setSelectedIds((sel) => {
        const next = sel.filter((s) => s !== id);
        persistSelection(next);
        return next;
      });
    },
    [persistItems, persistSelection],
  );

  const toggleSelect = useCallback(
    (id: string) => {
      setSelectedIds((sel) => {
        const exists = sel.includes(id);
        const next = exists ? sel.filter((s) => s !== id) : [...sel, id];
        persistSelection(next);
        if (!exists) {
          const item = items.find((i) => i.id === id);
          if (item?.downloadLocation) triggerDownload(item.downloadLocation, accessKey);
        }
        return next;
      });
    },
    [accessKey, items, persistSelection],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    persistSelection([]);
  }, [persistSelection]);

  const isSelected = useCallback((id: string) => selectedIds.includes(id), [selectedIds]);

  return {
    accessKey,
    hasKey: accessKey.length > 0,
    query,
    profiles,
    activeUsername,
    items,
    selectedIds,
    loading,
    error,
    setAccessKey,
    setQuery,
    searchProfiles,
    loadProfile,
    fetchMore,
    addUploads,
    removeItem,
    toggleSelect,
    clearSelection,
    isSelected,
  };
}
