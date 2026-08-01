"use client";

import { useEffect } from "react";

/**
 * Service worker kaydı. Yalnızca production'da çalışır — geliştirme sırasında
 * bayat cache hata ayıklamayı zorlaştırır.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // Sessizce yutma: kayıt başarısızsa uygulama çalışmaya devam eder
        // ama çevrimdışı desteği olmaz — bunu görebilmeliyiz.
        console.error("service worker registration failed", error?.name ?? error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
