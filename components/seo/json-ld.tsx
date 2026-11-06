/**
 * Datos estructurados (schema.org) para Google. El "<" se escapa para que un
 * texto editado desde el panel no pueda cerrar la etiqueta <script>.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
