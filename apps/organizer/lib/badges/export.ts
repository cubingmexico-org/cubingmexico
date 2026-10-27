import { toast } from "sonner";
import type { ExtendedPerson } from "@/types/wcif";
import type { Competition } from "@/types/wca";
import {
  type BadgeSide,
  badgeFileName,
  canvasToBlob,
  canvasToJpegBase64,
  downloadBlob,
  downloadUrl,
  downloadZip,
  fileSafeName,
} from "./download";
import { createBadgePdf } from "./pdf";
import { badgesPerSheet, createBadgeSheetPdf } from "./pdf-sheet";
import type { BadgeRenderer } from "./render-canvas";

type ToastMessages = { loading: string; success: string; error: string };

export function createBadgeExporters({
  selectedPersons,
  competition,
  setIsExporting,
  blankPerson,
  canvasWidth,
  canvasHeight,
  enableBackSide,
  pxToMm,
  createCanvasForSide,
}: {
  selectedPersons: ExtendedPerson[];
  competition: Competition;
  setIsExporting: (value: boolean) => void;
  blankPerson: ExtendedPerson;
  canvasWidth: number;
  canvasHeight: number;
  enableBackSide: boolean;
  pxToMm: BadgeRenderer["pxToMm"];
  createCanvasForSide: BadgeRenderer["createCanvasForSide"];
}) {
  const sides: BadgeSide[] = enableBackSide ? ["front", "back"] : ["front"];
  const competitionFileName = fileSafeName(competition.name);

  const personsOrBlank = () =>
    selectedPersons.length > 0 ? selectedPersons : [blankPerson];

  const runExport = (task: () => Promise<void>, messages: ToastMessages) => {
    setIsExporting(true);
    toast.promise(
      task().finally(() => {
        setIsExporting(false);
      }),
      messages,
    );
  };

  const countLabel = (count: number, one: string, many: string) =>
    count === 1 ? one : `${count} ${many}`;

  const exportToPNG = async () => {
    const persons = personsOrBlank();

    runExport(
      async () => {
        if (persons.length === 1) {
          const person = persons[0]!;
          for (const side of sides) {
            const blob = await canvasToBlob(
              await createCanvasForSide(person, side),
            );
            if (blob) downloadBlob(blob, badgeFileName(person, side, "png"));
          }
          return;
        }

        await downloadZip(async (zip) => {
          await Promise.all(
            persons.flatMap((person) =>
              sides.map(async (side) => {
                const blob = await canvasToBlob(
                  await createCanvasForSide(person, side),
                );
                if (blob) zip.file(badgeFileName(person, side, "png"), blob);
              }),
            ),
          );
        }, `${competitionFileName}_badges.zip`);
      },
      {
        loading: `Generando ${countLabel(persons.length, "gafete", "gafetes")}...`,
        success: `${countLabel(persons.length, "Gafete generado", "gafetes generados")} exitosamente`,
        error: "Error al generar los gafetes",
      },
    );
  };

  const exportToJPG = async () => {
    const persons = personsOrBlank();

    runExport(
      async () => {
        if (persons.length === 1) {
          const person = persons[0]!;
          for (const side of sides) {
            const canvas = await createCanvasForSide(person, side);
            downloadUrl(
              canvas.toDataURL("image/jpeg", 0.95),
              badgeFileName(person, side, "jpg"),
            );
          }
          return;
        }

        await downloadZip(async (zip) => {
          await Promise.all(
            persons.flatMap((person) =>
              sides.map(async (side) => {
                const base64 = canvasToJpegBase64(
                  await createCanvasForSide(person, side),
                );
                if (base64) {
                  zip.file(badgeFileName(person, side, "jpg"), base64, {
                    base64: true,
                  });
                }
              }),
            ),
          );
        }, `${competitionFileName}_badges_jpg.zip`);
      },
      {
        loading: `Generando ${countLabel(persons.length, "gafete", "gafetes")} JPG...`,
        success: `${countLabel(persons.length, "Gafete JPG generado", "gafetes JPG generados")} exitosamente`,
        error: "Error al generar los JPG",
      },
    );
  };

  const exportToPDF = async () => {
    const persons = personsOrBlank();
    const plural = persons.length === 1 ? "" : "s";

    runExport(
      async () => {
        const options = {
          pageWidthMm: pxToMm(canvasWidth),
          pageHeightMm: pxToMm(canvasHeight),
          enableBackSide,
          createCanvasForSide,
        };
        const pdfFileName = (person: ExtendedPerson) =>
          `${fileSafeName(person.name)}_badge.pdf`;

        if (persons.length === 1) {
          const person = persons[0]!;
          (await createBadgePdf(person, options)).save(pdfFileName(person));
          return;
        }

        await downloadZip(async (zip) => {
          await Promise.all(
            persons.map(async (person) => {
              const pdf = await createBadgePdf(person, options);
              zip.file(pdfFileName(person), pdf.output("blob"));
            }),
          );
        }, `${competitionFileName}_badges_pdf.zip`);
      },
      {
        loading: `Generando PDF${plural}...`,
        success: `PDF${plural} generado${plural} exitosamente`,
        error: "Error al generar los PDFs",
      },
    );
  };

  const exportToPDF2x2 = async () => {
    const perSheet = badgesPerSheet(enableBackSide);
    const persons: ExtendedPerson[] =
      selectedPersons.length > 0
        ? [...selectedPersons]
        : Array(perSheet).fill(blankPerson);
    // Fill the last sheet with blank badges.
    while (persons.length % perSheet !== 0) {
      persons.push(blankPerson);
    }

    runExport(
      async () => {
        const pdf = await createBadgeSheetPdf(persons, {
          enableBackSide,
          createCanvasForSide,
        });
        pdf.save(`${competitionFileName}_badges_2x2.pdf`);
      },
      {
        loading: `Generando PDF 2x2...`,
        success: `PDF 2x2 generado exitosamente`,
        error: "Error al generar el PDF 2x2",
      },
    );
  };

  return { exportToPNG, exportToJPG, exportToPDF, exportToPDF2x2 };
}
