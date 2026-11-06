"use client";

/*
  Último recurso: si falla el layout raíz (sin variables de entorno, sin la
  base de datos al leer los textos…), Next reemplaza toda la página con esto.
  No hereda globals.css ni la fuente, por eso los estilos van aquí mismo, con
  los mismos colores de la tienda. Recargar reintenta todo, layout incluido.
*/
export default function GlobalError() {
  return (
    <html lang="es-CO">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#ffffff",
          color: "#111111",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "24px"
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#6b6b6b" }}>MotoSmart Tapicería</p>
          <h1 style={{ margin: "8px 0 0", fontSize: "32px", lineHeight: 1.1 }}>No pudimos cargar la tienda</h1>
          <p style={{ margin: "12px 0 0", fontSize: "18px", lineHeight: 1.5, color: "#4d4d4d" }}>
            Suele ser un problema de conexión pasajero. Intenta de nuevo en unos segundos.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "28px",
              minHeight: "48px",
              padding: "0 24px",
              border: 0,
              borderRadius: "8px",
              background: "#c8102e",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
