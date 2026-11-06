"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { describedBy, Field } from "@/features/admin/components/fields";
import { ErrorState, Loading, Panel, SkeletonList, TabHeader } from "@/features/admin/components/primitives";
import { saveSettings } from "@/features/admin/lib/actions";
import { confirmAction, runBusy } from "@/features/admin/lib/feedback";
import { plural } from "@/features/admin/lib/format";
import { SETTING_FIELDS, SETTING_GROUPS, validateSetting, type SettingField } from "@/features/admin/lib/settings-keys";
import { retry, setAdminState, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";

/** Lo que la tienda muestra hoy para una clave: lo guardado o, si no existe, el texto de respaldo. */
function baseline(settings: Record<string, string>, field: SettingField) {
  return settings[field.key] ?? DEFAULT_SETTINGS[field.key];
}

export function SettingsTab() {
  const status = useAdminData(["settings"]);
  const settings = useAdminStore((state) => state.settings);
  const edits = useAdminStore((state) => state.settingsEdits);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());

  const changed = SETTING_FIELDS.filter(
    (field) => field.key in edits && edits[field.key].trim() !== baseline(settings, field).trim()
  );
  const invalid = changed.filter((field) => validateSetting(field, edits[field.key]));

  function edit(field: SettingField, value: string) {
    setAdminState((state) => ({ settingsEdits: { ...state.settingsEdits, [field.key]: value } }));
  }

  async function discard() {
    const ok = await confirmAction({
      title: `¿Descartar ${plural(changed.length, "cambio", "cambios")}?`,
      description: "Los textos vuelven a como están en la tienda.",
      confirmLabel: "Descartar",
      tone: "danger"
    });
    if (!ok) return;
    setAdminState({ settingsEdits: {} });
    setTouched(new Set());
  }

  async function save() {
    if (invalid.length > 0) {
      setTouched(new Set(changed.map((field) => field.key)));
      document.querySelector<HTMLElement>(`[data-setting="${invalid[0].key}"]`)?.focus();
      return;
    }
    await runBusy("Guardando textos…", async () => {
      await saveSettings();
      setTouched(new Set());
    });
  }

  if (status === "error" && Object.keys(settings).length === 0) {
    return (
      <div className="space-y-6">
        <TabHeader title="Textos" />
        <ErrorState onRetry={() => retry(["settings"])}>No se pudieron cargar los textos.</ErrorState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TabHeader
        title="Textos"
        description="Lo que dice la tienda: portada, contacto, servicios y lo que sale en Google. Se publica al guardar."
      />

      {status === "loading" ? (
        <Loading>
          <SkeletonList rows={6} />
        </Loading>
      ) : (
        <>
          {SETTING_GROUPS.map((group) => (
            <Panel key={group.id} title={group.title} description={group.description}>
              <div className="grid gap-5 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <SettingInput
                    key={field.key}
                    field={field}
                    value={edits[field.key] ?? baseline(settings, field)}
                    changed={changed.includes(field)}
                    showError={touched.has(field.key)}
                    onChange={(value) => edit(field, value)}
                    onBlur={() => {
                      if (field.key in edits) setTouched((current) => new Set(current).add(field.key));
                    }}
                  />
                ))}
              </div>
            </Panel>
          ))}

          {changed.length > 0 ? (
            <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-3 rounded-lg border border-line-strong bg-bg p-3 shadow-float sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
              <p className="font-semibold" role="status">
                {plural(changed.length, "cambio sin guardar", "cambios sin guardar")}
                {invalid.length ? (
                  <span className="block text-sm font-normal text-danger">
                    {plural(invalid.length, "texto necesita", "textos necesitan")} corrección.
                  </span>
                ) : null}
              </p>
              <div className="flex gap-2 *:flex-1 sm:*:flex-none">
                <Button variant="secondary" onClick={() => void discard()}>
                  Descartar
                </Button>
                <Button variant="dark" onClick={() => void save()}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function SettingInput({
  field,
  value,
  changed,
  showError,
  onChange,
  onBlur
}: {
  field: SettingField;
  value: string;
  changed: boolean;
  showError: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const id = useId();
  const error = changed && showError ? validateSetting(field, value) : null;
  const counter = field.kind === "textarea" ? `${value.trim().length} de ${field.max}.` : null;
  const hint = [field.hint, counter].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    value,
    "data-setting": field.key,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy(id, hint, error),
    onBlur
  };

  return (
    <Field
      id={id}
      label={field.label}
      optional={field.optional}
      hint={hint}
      error={error}
      className={field.kind === "textarea" ? "sm:col-span-2" : undefined}
    >
      {field.kind === "textarea" ? (
        <Textarea {...common} rows={4} className="min-h-28" onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input
          {...common}
          type={field.kind === "tel" ? "tel" : field.kind === "url" ? "url" : "text"}
          inputMode={field.kind === "tel" ? "tel" : field.kind === "url" ? "url" : undefined}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {changed ? <span className="sr-only">Cambiado, sin guardar.</span> : null}
    </Field>
  );
}
