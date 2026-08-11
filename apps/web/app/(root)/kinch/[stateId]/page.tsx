import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { StateSelector } from "./_components/state-selector";
import { getStates } from "@/db/queries";
import type { Metadata } from "next";
import { getTeam } from "@/db/queries";
import { getKinchRanksState } from "./_lib/queries";

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateStaticParams() {
  const states = await getStates();
  return states.map((state) => ({ stateId: state.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;

  const team = await getTeam(stateId);

  return {
    title: `Kinch Ranks de ${team?.state} | Cubing México`,
    description: `Encuentra el ranking del ${team?.name} de speedcubing en México en cada evento de la WCA. Filtra por estado, género y más.`,
  };
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
}) {
  const stateId = (await props.params).stateId;

  const persons = await getKinchRanksState(stateId);

  const states = await getStates();

  const stateName = states.find((state) => state.id === stateId)?.name;

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          Kinch Ranks estatales de {stateName}
        </h1>
        <p>
          Los Kinch Ranks son un sistema de clasificación innovador diseñado
          para evaluar la habilidad de un cubero en los 17 eventos oficiales de
          la WCA. Este sistema utiliza un enfoque único para calcular la
          puntuación de cada competidor en función de sus resultados en cada
          evento. Cada evento se puntúa en una escala del 0 al 100, considerando
          tanto los{" "}
          <Link
            className="text-muted-foreground hover:underline"
            href={`/records/${stateId}`}
          >
            récords estatales (SR)
          </Link>{" "}
          como los récords personales (PR) de los competidores. A través de este
          enfoque, se busca equilibrar la clasificación entre todos los eventos,
          eliminando las desventajas percibidas en sistemas tradicionales como
          el{" "}
          <Link
            className="text-muted-foreground hover:underline"
            href="/sor/single"
          >
            SOR
          </Link>{" "}
          y promoviendo una visión más integral de las habilidades en la
          resolución de rompecabezas.
        </p>
        <StateSelector states={states} stateName={stateName!} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>
              <span className="cubing-icon event-333" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-222" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-444" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-555" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-666" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-777" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-333bf" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-333fm" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-333oh" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-clock" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-minx" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-pyram" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-skewb" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-sq1" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-444bf" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-555bf" />
            </TableHead>
            <TableHead>
              <span className="cubing-icon event-333mbf" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {persons.map((person, index) => (
            <TableRow key={person.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Link
                  className="text-link hover:text-link/80"
                  href={`/persons/${person.id}`}
                >
                  {person.name}
                </Link>
              </TableCell>
              <TableCell className="font-semibold">
                {person.overall.toFixed(2)}
              </TableCell>
              {person.events.map((event) => (
                <TableCell
                  key={event.eventId}
                  className={cn(
                    event.ratio === 0 && "text-red-500 font-semibold",
                    event.ratio === 100 && "text-green-500 font-semibold",
                  )}
                >
                  {event.ratio.toFixed(2)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
