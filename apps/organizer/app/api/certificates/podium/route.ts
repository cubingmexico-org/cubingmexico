import { getWCIFByCompetitionId, getCompetitionById } from "@/db/queries";
import { podiumRequestSchema } from "@/lib/certificates/requests";
import { requireSessionUser } from "@/lib/design-access";
import type { Event, Person, PodiumData, Result } from "@/types/wcif";

// Helper function to calculate age at a specific date
function calculateAge(birthdate: string, referenceDate: Date): number {
  const birth = new Date(birthdate);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

// POST rather than GET so competitors' birthdates never end up in a URL or request log.
export async function POST(request: Request): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = podiumRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    competitionId,
    filterByCountry,
    country,
    template,
    minAge,
    maxAge,
    birthdates,
  } = parsed.data;
  const gender = template === "female" ? "f" : undefined;
  const newcomer = template === "newcomer";
  const birthdateMap = birthdates ? new Map(birthdates) : undefined;

  const wcif = await getWCIFByCompetitionId({ competitionId });
  const events = wcif?.events || [];
  const persons = wcif?.persons || [];

  // Get competition end date for age calculation
  let competitionEndDate: Date | undefined;
  if (template === "age" && birthdateMap) {
    const competition = await getCompetitionById({ id: competitionId });
    if (competition?.end_date) {
      const [endYear, endMonth, endDay] = competition.end_date
        .split("-")
        .map(Number);
      competitionEndDate = new Date(endYear!, endMonth! - 1, endDay);
    }
  }

  const personsWithRegistrantId = persons.filter((person) => {
    // Basic filters
    if (person.registrantId === null) return false;
    if (filterByCountry && person.countryIso2 !== country) return false;
    if (gender && person.gender !== gender) return false;
    if (newcomer && person.wcaId) return false;

    // Age filter
    if (
      template === "age" &&
      birthdateMap &&
      competitionEndDate &&
      minAge !== undefined &&
      maxAge !== undefined
    ) {
      const birthdate = birthdateMap.get(person.registrantId);
      if (!birthdate) return false; // Exclude if no birthdate

      const age = calculateAge(birthdate, competitionEndDate);
      if (age < minAge || age > maxAge) return false;
    }

    return true;
  });

  const personIdToName: Record<number, string> = {};
  personsWithRegistrantId.forEach((person: Person) => {
    if (person.registrantId !== null) {
      personIdToName[person.registrantId] = person.name;
    }
  });

  function getEventData(event: Event) {
    const finalRound = event.rounds[event.rounds.length - 1];
    if (!finalRound) {
      return undefined;
    }

    const missingResults = finalRound.results.find(
      (result: Result) => result.ranking === null,
    );

    if (missingResults) {
      return undefined;
    }

    const isBestOnlyEvent =
      event.id === "333bf" ||
      event.id === "444bf" ||
      event.id === "555bf" ||
      event.id === "333mbf";

    const results = finalRound.results
      .filter(
        (result: Result) =>
          result.ranking !== null &&
          result.best !== -1 &&
          result.best !== -2 &&
          (isBestOnlyEvent || result.average !== -1) && // Only check average for non-best-only events
          personIdToName[result.personId] !== undefined, // Only include filtered people
      )
      .sort((a, b) => {
        const aResult = isBestOnlyEvent ? a.best : a.average;
        const bResult = isBestOnlyEvent ? b.best : b.average;
        return aResult - bResult;
      })
      .slice(0, 3)
      .map((person) => ({
        personName: personIdToName[person.personId],
        result: isBestOnlyEvent ? person.best : person.average,
      }));

    return results;
  }

  const podiums: PodiumData[] = [];

  events.map((event) => {
    const results = getEventData(event);
    if (!results) {
      // Skip if event is incomplete
      return;
    }
    results.map((result, index: number) => {
      podiums.push({
        name: result.personName!,
        place: index + 1,
        event: event.id,
        result: result.result,
      });
    });
  });

  return Response.json(podiums);
}
