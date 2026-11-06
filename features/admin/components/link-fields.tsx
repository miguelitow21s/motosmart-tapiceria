"use client";

import { useId, useMemo } from "react";
import { Field, Select } from "@/features/admin/components/fields";
import { useAdminStore } from "@/features/admin/store/admin-data";
import { cn } from "@/lib/cn";

/*
  Marca y diseño de una foto. Elegir un diseño pone su marca; cambiar la marca
  suelta el diseño si ya no le corresponde. Sin marca elegida, los diseños se
  agrupan por marca para encontrarlos rápido.
*/
export function LinkFields({
  brandId,
  designId,
  onChange,
  className
}: {
  brandId: string;
  designId: string;
  onChange: (next: { brand_id: string; design_id: string }) => void;
  className?: string;
}) {
  const id = useId();
  const designs = useAdminStore((state) => state.designs);
  const brands = useAdminStore((state) => state.brands);

  const groups = useMemo(() => {
    const sorted = [...designs].sort((a, b) => a.name.localeCompare(b.name, "es"));
    return brands
      .filter((brand) => !brandId || brand.id === brandId)
      .map((brand) => ({ brand, designs: sorted.filter((design) => design.brand_id === brand.id) }))
      .filter((group) => group.designs.length > 0);
  }, [designs, brands, brandId]);

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <Field id={`${id}-brand`} label="Marca" optional>
        <Select
          id={`${id}-brand`}
          value={brandId}
          onChange={(event) => {
            const nextBrand = event.target.value;
            const design = designs.find((item) => item.id === designId);
            onChange({ brand_id: nextBrand, design_id: design && design.brand_id === nextBrand ? designId : "" });
          }}
        >
          <option value="">Sin marca</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={`${id}-design`} label="Diseño" optional>
        <Select
          id={`${id}-design`}
          value={designId}
          onChange={(event) => {
            const nextDesign = event.target.value;
            const design = designs.find((item) => item.id === nextDesign);
            onChange({ brand_id: design?.brand_id ?? brandId, design_id: nextDesign });
          }}
        >
          <option value="">Sin diseño</option>
          {brandId
            ? groups[0]?.designs.map((design) => (
                <option key={design.id} value={design.id}>
                  {design.name}
                </option>
              ))
            : groups.map((group) => (
                <optgroup key={group.brand.id} label={group.brand.name}>
                  {group.designs.map((design) => (
                    <option key={design.id} value={design.id}>
                      {design.name}
                    </option>
                  ))}
                </optgroup>
              ))}
        </Select>
      </Field>
    </div>
  );
}
