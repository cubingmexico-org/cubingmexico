"use client";

import { useState } from "react";
import { formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { revalidateWCIF } from "@/app/actions";

export function BadgeStatusCard({
  competitionId,
  personCount,
}: {
  competitionId: string;
  personCount: number;
}) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Estado de los Gafetes</CardTitle>
        <CardDescription>
          Información sobre los gafetes generados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Gafetes de Participantes</h4>
            <span className="text-xs text-muted-foreground">
              {personCount} generados
            </span>
          </div>
          <Progress value={100} className="h-2" />
        </div>
        <div className="rounded-md bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Última actualización</h4>
              <p className="text-xs text-muted-foreground">
                {formatDistance(lastUpdate, new Date(), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 transition-all"
              onClick={async () => {
                const result = await revalidateWCIF(competitionId);
                if (!result.ok) {
                  toast.error("No se pudo actualizar", {
                    description: result.error,
                  });
                  return;
                }
                setLastUpdate(new Date());
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
