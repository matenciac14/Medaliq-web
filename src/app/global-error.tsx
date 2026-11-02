"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h1 style={{ fontSize: "4rem", fontWeight: "bold", color: "#1e3a5f" }}>500</h1>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>Algo salio mal. Intenta de nuevo.</p>
            <button
              onClick={reset}
              style={{ padding: "12px 24px", backgroundColor: "#ea580c", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16 }}
            >
              Intentar de nuevo
            </button>
            {error.digest && (
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 16, fontFamily: "monospace" }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
