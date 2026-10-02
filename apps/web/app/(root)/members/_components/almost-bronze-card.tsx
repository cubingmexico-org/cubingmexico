import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  Table,
} from "@workspace/ui/components/table";

interface AlmostBronzeCardProps {
  children: React.ReactNode;
}

export function AlmostBronzeCard({ children }: AlmostBronzeCardProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Casi Bronce</CardTitle>
        <CardDescription>
          Speedcubers mexicanos a un evento de alcanzar el nivel Bronce (16/17
          eventos)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid">
          <div className="w-full overflow-auto">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Eventos</TableHead>
                    <TableHead>Evento faltante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{children}</TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
