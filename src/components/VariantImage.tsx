"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { buildVariantCandidates, normalizeUploadUrl, type ImageVariantSize } from "@/lib/image-variants";

type VariantImageProps = Omit<ComponentProps<typeof Image>, "src" | "alt"> & {
  src: string;
  alt: string;
  variant: ImageVariantSize;
};

export function VariantImage({ src, alt, variant, ...rest }: VariantImageProps) {
  const candidates = useMemo(() => buildVariantCandidates(src, variant), [src, variant]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const current = candidates[Math.min(candidateIndex, Math.max(0, candidates.length - 1))] || normalizeUploadUrl(src);

  return (
    <Image
      {...rest}
      src={current}
      alt={alt}
      onError={() => {
        setCandidateIndex((prev) => Math.min(prev + 1, Math.max(0, candidates.length - 1)));
      }}
    />
  );
}
