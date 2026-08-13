import { getWCIFByCompetitionId } from "@/db/queries";
import { ParticipantData } from "@/types/wcif";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const competitionId = searchParams.get("competitionId");
  const wcif = await getWCIFByCompetitionId({
    competitionId: competitionId!,
  });
  const persons = wcif?.persons || [];

  const personsWithRegistrantId = persons.filter(
    (person) => person.registrantId !== null,
  );

  const events = wcif?.events || [];

  const allResults: ParticipantData[] = [];

  for (const person of personsWithRegistrantId) {
    const results = [];
    for (const event of events) {
      if (
        person.registration &&
        person.registration.eventIds.includes(event.id)
      ) {
        for (const round of event.rounds) {
          for (const result of round.results) {
            if (result.personId === person.registrantId) {
              const existingResultIndex: number = results.findIndex(
                (r) => r.event === event.id,
              );
              const newResult = {
                event: event.id,
                ranking: result.ranking,
                average:
                  event.id === "333bf" ||
                  event.id === "444bf" ||
                  event.id === "555bf" ||
                  event.id === "333mbf"
                    ? result.best
                    : result.average === 0
                      ? result.best
                      : result.average,
              };
              if (existingResultIndex !== -1) {
                results[existingResultIndex] = newResult;
              } else {
                results.push(newResult);
              }
            }
          }
        }
      }
    }

    results.sort((a, b) => {
      const aSpecial = [-2, -1, 0].includes(a.average);
      const bSpecial = [-2, -1, 0].includes(b.average);
      if (aSpecial && !bSpecial) return 1;
      if (!aSpecial && bSpecial) return -1;
      return (a.ranking ?? 0) - (b.ranking ?? 0);
    });

    const personWithResults = {
      wcaId: person.wcaId,
      registrantId: person.registrantId,
      name: person.name,
      results,
    };

    if (
      personWithResults.results.length > 0 &&
      !personWithResults.results.some((r) => r.ranking === null)
    ) {
      allResults.push(personWithResults);
    }
  }

  return Response.json(allResults);
}
