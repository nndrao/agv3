/// <reference types="@openfin/core" />

declare global {
  const fin: typeof window.fin;
  
  interface Window {
    fin: OpenFin.Fin;
  }
}

export {};