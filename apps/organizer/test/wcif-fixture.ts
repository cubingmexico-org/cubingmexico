import type {
  Activity,
  Assignment,
  EventId,
  Person,
  Round,
  WCIF,
} from "@/types/wcif";

/**
 * A small, fully assigned competition for printable snapshot tests:
 * 3x3 (Ao5, cutoff and time limit) with two groups, 3BLD (Bo3) with one,
 * four competitors, and judges/scramblers on the 3x3 groups.
 */

const VENUE_TZ = "America/Mexico_City";

function activity(
  id: number,
  activityCode: string,
  startTime: string,
  endTime: string,
  childActivities: Activity[] = [],
): Activity {
  return {
    id,
    name: activityCode,
    activityCode,
    startTime,
    endTime,
    childActivities,
  };
}

function round(id: string, overrides: Partial<Round> = {}): Round {
  return {
    id,
    format: "a",
    timeLimit: null,
    cutoff: null,
    participationRuleset: null,
    linkedRounds: null,
    scrambleSetCount: 1,
    results: [],
    extensions: [],
    ...overrides,
  };
}

function person(
  registrantId: number,
  name: string,
  wcaId: string | null,
  eventIds: EventId[],
  assignments: Assignment[],
): Person {
  return {
    name,
    wcaUserId: 1000 + registrantId,
    wcaId,
    registrantId,
    countryIso2: "MX",
    gender: null,
    registration: {
      wcaRegistrationId: 5000 + registrantId,
      eventIds,
      status: "accepted",
      isCompeting: true,
    },
    avatar: null,
    roles: [],
    assignments,
    personalBests: [],
    extensions: [],
  };
}

const competitor = (activityId: number, stationNumber: number): Assignment => ({
  activityId,
  stationNumber,
  assignmentCode: "competitor",
});

const staff = (activityId: number, assignmentCode: string): Assignment => ({
  activityId,
  stationNumber: null,
  assignmentCode,
});

// Activity ids: rounds 1 and 10; 3x3 groups 2 and 3; 3BLD group 11.
const G333_1 = 2;
const G333_2 = 3;
const G3BF_1 = 11;

export function makePrintablesWcif(): WCIF {
  return {
    formatVersion: "1.0",
    id: "PrintablesOpen2025",
    name: "Printables Open 2025",
    shortName: "Printables Open 2025",
    competitorLimit: 40,
    extensions: [],
    schedule: {
      startDate: "2025-03-15",
      numberOfDays: 1,
      venues: [
        {
          id: 1,
          name: "Centro de Convenciones",
          latitudeMicrodegrees: 19432608,
          longitudeMicrodegrees: -99133209,
          countryIso2: "MX",
          timezone: VENUE_TZ,
          rooms: [
            {
              id: 1,
              name: "Sala Principal",
              color: "#304a96",
              activities: [
                activity(
                  1,
                  "333-r1",
                  "2025-03-15T16:00:00Z",
                  "2025-03-15T17:00:00Z",
                  [
                    activity(
                      G333_1,
                      "333-r1-g1",
                      "2025-03-15T16:00:00Z",
                      "2025-03-15T16:30:00Z",
                    ),
                    activity(
                      G333_2,
                      "333-r1-g2",
                      "2025-03-15T16:30:00Z",
                      "2025-03-15T17:00:00Z",
                    ),
                  ],
                ),
                activity(
                  10,
                  "333bf-r1",
                  "2025-03-15T18:00:00Z",
                  "2025-03-15T18:45:00Z",
                  [
                    activity(
                      G3BF_1,
                      "333bf-r1-g1",
                      "2025-03-15T18:00:00Z",
                      "2025-03-15T18:45:00Z",
                    ),
                  ],
                ),
              ],
            },
          ],
        },
      ],
    },
    events: [
      {
        id: "333",
        rounds: [
          round("333-r1", {
            timeLimit: { centiseconds: 60000, cumulativeRoundIds: [] },
            cutoff: { numberOfAttempts: 2, resultValue: 3000 },
          }),
        ],
        extensions: [],
        qualification: null,
      },
      {
        id: "333bf",
        rounds: [
          round("333bf-r1", {
            format: "3",
            timeLimit: {
              centiseconds: 60000,
              cumulativeRoundIds: ["333bf-r1"],
            },
          }),
        ],
        extensions: [],
        qualification: null,
      },
    ],
    persons: [
      person(
        1,
        "Ana López",
        "2015LOPE01",
        ["333", "333bf"],
        [
          competitor(G333_1, 1),
          staff(G333_2, "staff-judge"),
          competitor(G3BF_1, 1),
        ],
      ),
      person(
        2,
        "Beto Martínez (贝托)",
        "2016MART02",
        ["333"],
        [competitor(G333_1, 2), staff(G333_2, "staff-scrambler")],
      ),
      person(
        3,
        "Carla Núñez",
        "2019NUNE01",
        ["333", "333bf"],
        [
          competitor(G333_2, 1),
          staff(G333_1, "staff-judge"),
          competitor(G3BF_1, 2),
        ],
      ),
      person(
        4,
        "Diego Ramírez",
        null,
        ["333"],
        [competitor(G333_2, 2), staff(G333_1, "staff-runner")],
      ),
    ],
  };
}
