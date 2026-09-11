/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_IMAGE_KIT_END_POINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
