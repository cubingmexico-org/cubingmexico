import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { CurrentRecord } from "../_lib/queries";
import { formatRecordResult, formatRecordSolves } from "../_lib/format";
import { StateLabel } from "@/components/state-flag";

function SolvesCell({
  eventId,
  solves,
}: {
  eventId: string;
  solves: number[];
}) {
  const formatted = formatRecordSolves(eventId, solves);

  return (
    <p className="flex gap-4">
      {formatted.map(({ key, text, isOutlier }) =>
        text == null ? null : (
          <span key={key}>{isOutlier ? `(${text})` : text}</span>
        ),
      )}
    </p>
  );
}

function PersonLink({
  personId,
  name,
}: {
  personId: string;
  name: string | null | undefined;
}) {
  if (!name) return null;
  return (
    <Link
      className="text-link hover:text-link/80"
      href={`/persons/${personId}`}
    >
      {name}
    </Link>
  );
}

function CompetitionLink({
  competitionId,
  name,
}: {
  competitionId: string | undefined;
  name: string | undefined;
}) {
  if (!competitionId || !name) return null;
  return (
    <Link
      className="text-link hover:text-link/80"
      href={`/competitions/${competitionId}`}
    >
      {name}
    </Link>
  );
}

export function MixedRecordsTable({ records }: { records: CurrentRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Single</TableHead>
          <TableHead>Evento</TableHead>
          <TableHead>Average</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Resoluciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.eventId}>
            <TableCell className="whitespace-nowrap">
              <PersonLink
                personId={record.single.personId}
                name={record.single.name}
              />
            </TableCell>
            <TableCell>
              {formatRecordResult(record.eventId, record.single.best)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <div className="flex gap-2 items-center">
                <span
                  className={`cubing-icon event-${record.eventId} text-xl`}
                />
                {record.eventName}
              </div>
            </TableCell>
            <TableCell>
              {record.eventId === "333mbf" || !record.average ? (
                <span className="text-muted-foreground font-thin">N/A</span>
              ) : (
                formatRecordResult(
                  record.eventId,
                  record.average.best,
                  "average",
                )
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {record.eventId !== "333mbf" && record.average ? (
                <PersonLink
                  personId={record.average.personId}
                  name={record.average.name}
                />
              ) : null}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {record.eventId !== "333mbf" && record.average ? (
                <SolvesCell
                  eventId={record.eventId}
                  solves={record.average.solves}
                />
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SlimRecordsTables({ records }: { records: CurrentRecord[] }) {
  const averageRecords = records.filter(
    (record) => record.eventId !== "333mbf" && record.average,
  );

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Single</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Competencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={`single-${record.eventId}`}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex gap-2 items-center">
                    <span
                      className={`cubing-icon event-${record.eventId} text-xl`}
                    />
                    {record.eventName}
                  </div>
                </TableCell>
                <TableCell>
                  {formatRecordResult(record.eventId, record.single.best)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <PersonLink
                    personId={record.single.personId}
                    name={record.single.name}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StateLabel stateName={record.single.state} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <CompetitionLink
                    competitionId={record.single.competitionId}
                    name={record.single.competition}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Average</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Competencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {averageRecords.map((record) => (
              <TableRow key={`average-${record.eventId}`}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex gap-2 items-center">
                    <span
                      className={`cubing-icon event-${record.eventId} text-xl`}
                    />
                    {record.eventName}
                  </div>
                </TableCell>
                <TableCell>
                  {formatRecordResult(
                    record.eventId,
                    record.average!.best,
                    "average",
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <PersonLink
                    personId={record.average!.personId}
                    name={record.average!.name}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StateLabel stateName={record.average!.state} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <CompetitionLink
                    competitionId={record.average!.competitionId}
                    name={record.average!.competition}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function SeparateRecordsTables({
  records,
}: {
  records: CurrentRecord[];
}) {
  return (
    <>
      {records.map((record) => (
        <div key={record.eventId} className="space-y-4 py-4">
          <div className="flex gap-2 items-center">
            <span className={`cubing-icon event-${record.eventId} text-2xl`} />
            <h2 className="text-lg font-medium">{record.eventName}</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Competencia</TableHead>
                <TableHead>Resoluciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Single</TableCell>
                <TableCell className="whitespace-nowrap">
                  <PersonLink
                    personId={record.single.personId}
                    name={record.single.name}
                  />
                </TableCell>
                <TableCell>
                  {formatRecordResult(record.eventId, record.single.best)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StateLabel stateName={record.single.state} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <CompetitionLink
                    competitionId={record.single.competitionId}
                    name={record.single.competition}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <SolvesCell
                    eventId={record.eventId}
                    solves={record.single.solves}
                  />
                </TableCell>
              </TableRow>
              {record.eventId !== "333mbf" ? (
                <TableRow>
                  <TableCell>Average</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {record.average ? (
                      <PersonLink
                        personId={record.average.personId}
                        name={record.average.name}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {record.average ? (
                      formatRecordResult(
                        record.eventId,
                        record.average.best,
                        "average",
                      )
                    ) : (
                      <span className="text-muted-foreground font-thin">
                        N/A
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {record.average?.state ? (
                      <StateLabel stateName={record.average.state} />
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {record.average ? (
                      <CompetitionLink
                        competitionId={record.average.competitionId}
                        name={record.average.competition}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {record.average ? (
                      <SolvesCell
                        eventId={record.eventId}
                        solves={record.average.solves}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      ))}
    </>
  );
}
