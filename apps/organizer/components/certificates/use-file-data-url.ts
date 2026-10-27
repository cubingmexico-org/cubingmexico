"use client";

import { useEffect, useState } from "react";

/** The first file as a data URL (for certificate backgrounds), or undefined when there is none. */
export function useFileDataUrl(files: File[]): string | undefined {
  const [dataUrl, setDataUrl] = useState<string>();

  useEffect(() => {
    const file = files[0];
    if (!file) {
      setDataUrl(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [files]);

  return dataUrl;
}
