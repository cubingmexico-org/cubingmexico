import { useEffect } from "react";

/** Reads the first uploaded file as a data URL into `setBackground`, or clears it when there is none. */
export function useBackgroundFile(
  files: File[],
  setBackground: (dataUrl: string | undefined) => void,
) {
  useEffect(() => {
    const file = files[0];
    if (!file) {
      setBackground(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackground(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [files, setBackground]);
}
