/**
 * Tipos do domínio Unsplash — subconjunto enxuto da resposta da API que este
 * app consome. Ver https://unsplash.com/documentation para o objeto completo.
 */

/** URLs da foto em várias resoluções (todas devem ser hotlinked, nunca baixadas). */
export interface UnsplashPhotoUrls {
  raw: string;
  full: string;
  regular: string; // ~1080px — usada como feed do caleidoscópio
  small: string; // ~400px
  thumb: string; // ~200px — usada nas miniaturas da grade
}

/** Foto do Unsplash (campos usados aqui). */
export interface UnsplashPhoto {
  id: string;
  urls: UnsplashPhotoUrls;
  alt_description: string | null;
  blur_hash: string | null;
  /** Links da foto; `download_location` é o endpoint de tracking (Guidelines). */
  links: { html: string; download_location: string };
  /** Autor — atribuição obrigatória (Guidelines). */
  user: { name: string; username: string; links: { html: string } };
}

/** Perfil/usuário do Unsplash retornado pela busca. */
export interface UnsplashUser {
  id: string;
  username: string;
  name: string;
  profile_image: { small: string; medium: string; large: string };
  links: { html: string };
}
