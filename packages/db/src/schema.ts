import { type InferSelectModel, sql, type SQLWrapper } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  smallint,
  integer,
  primaryKey,
  timestamp,
  date,
  doublePrecision,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { unaccentLower } from "./search-sql";

// Site search matches `unaccentLower(column) LIKE '%q%'`; requires pg_trgm (migration 0019).
const trigramSearchIndex = (name: string, column: SQLWrapper) =>
  index(name).using("gin", sql`${unaccentLower(column)} gin_trgm_ops`);

// WCA

export const competition = pgTable(
  "competitions",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    information: text("information"),
    externalWebsite: varchar("external_website", { length: 200 }),
    venue: varchar("venue", { length: 240 }).notNull(),
    cityName: varchar("city_name", { length: 50 }).notNull(),
    countryId: varchar("country_id", { length: 50 }).notNull(),
    venueAddress: varchar("venue_address", { length: 191 }),
    venueDetails: varchar("venue_details", { length: 191 }),
    cellName: varchar("cell_name", { length: 45 }).notNull(),
    cancelled: boolean("cancelled").notNull().default(false),
    // eventSpecs: text("event_specs"),
    // delegates: text("delegates"),
    // organizers: text("organizers"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    latitudeMicrodegrees: integer("latitude_microdegrees"),
    longitudeMicrodegrees: integer("longitude_microdegrees"),
    // Cubing México
    stateId: varchar("state_id", { length: 3 }).references(() => state.id, {
      onDelete: "cascade",
    }),
    logo: text("logo"),
  },
  (t) => [
    index("competitions_state_idx").on(t.stateId),
    index("competitions_date_idx").on(t.startDate, t.endDate),
    trigramSearchIndex("competitions_name_search_idx", t.name),
    trigramSearchIndex("competitions_city_search_idx", t.cityName),
  ],
);

export type Competition = InferSelectModel<typeof competition>;

export const championship = pgTable(
  "championships",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    competitionId: varchar("competition_id", { length: 32 })
      .references(() => competition.id, { onDelete: "cascade" })
      .notNull(),
    championshipType: varchar("championship_type", {
      length: 50,
    }).notNull(),
  },
  (t) => [index("championship_comp_idx").on(t.competitionId)],
);

export type Championship = InferSelectModel<typeof championship>;

export const event = pgTable("events", {
  id: varchar("id", { length: 6 }).primaryKey(),
  format: varchar("format", { length: 10 }).notNull(),
  name: varchar("name", { length: 54 }).notNull(),
  rank: integer("rank").notNull().default(0),
});

export type Event = InferSelectModel<typeof event>;

export const roundType = pgTable("round_types", {
  id: varchar("id", { length: 1 }).primaryKey(),
  final: boolean("final").notNull().default(false),
  name: varchar("name", { length: 256 }).notNull(),
  rank: integer("rank").notNull().default(0),
  cellName: varchar("cell_name", { length: 45 }).notNull(),
});

export type RoundType = InferSelectModel<typeof roundType>;

export const formats = pgTable("formats", {
  id: varchar("id", { length: 1 }).primaryKey(),
  expectedSolveCount: smallint("expected_solve_count").notNull().default(0),
  name: varchar("name", { length: 50 }).notNull(),
  sortBy: varchar("sort_by", {
    length: 10,
    enum: ["single", "average"],
  }).notNull(),
  sortBySecond: varchar("sort_by_second", {
    length: 10,
    enum: ["single", "average"],
  }),
  trimFastestN: boolean("trim_fastest_n").notNull().default(false),
  trimSlowestN: boolean("trim_slowest_n").notNull().default(false),
});

export type Formats = InferSelectModel<typeof formats>;

export const competitionEvent = pgTable(
  "competition_events",
  {
    competitionId: varchar("competition_id", { length: 32 })
      .references(() => competition.id, { onDelete: "cascade" })
      .notNull(),
    eventId: varchar("event_id", { length: 6 })
      .references(() => event.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.competitionId, t.eventId] }),
    index("comp_event_event_idx").on(t.eventId),
  ],
);

export type CompetitionEvent = InferSelectModel<typeof competitionEvent>;

/**
 * Last local calendar date of each round (WCA 9i2), derived from WCIF schedule
 * or entered manually after results exist.
 */
export const competitionRoundDate = pgTable(
  "competition_round_dates",
  {
    competitionId: varchar("competition_id", { length: 32 })
      .references(() => competition.id, { onDelete: "cascade" })
      .notNull(),
    eventId: varchar("event_id", { length: 6 })
      .references(() => event.id, { onDelete: "cascade" })
      .notNull(),
    roundTypeId: varchar("round_type_id", { length: 1 })
      .references(() => roundType.id, { onDelete: "cascade" })
      .notNull(),
    endDate: date("end_date").notNull(),
    source: varchar("source", {
      length: 16,
      enum: ["wcif", "manual"],
    }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.competitionId, t.eventId, t.roundTypeId],
    }),
    index("comp_round_dates_comp_idx").on(t.competitionId),
  ],
);

export type CompetitionRoundDate = InferSelectModel<
  typeof competitionRoundDate
>;

export const person = pgTable(
  "persons",
  {
    wcaId: varchar("wca_id", { length: 10 }).primaryKey(),
    name: varchar("name", { length: 80 }),
    gender: varchar("gender", { length: 1, enum: ["m", "f", "o"] }),
    // Cubing México
    stateId: varchar("state_id", { length: 3 }).references(() => state.id, {
      onDelete: "cascade",
    }),
    hideFromRoster: boolean("hide_from_roster").notNull().default(false),
  },
  (t) => [
    index("person_name_idx").on(t.name),
    index("person_state_idx").on(t.stateId),
    trigramSearchIndex("person_name_search_idx", t.name),
    trigramSearchIndex("person_wca_id_search_idx", t.wcaId),
  ],
);

export type Person = InferSelectModel<typeof person>;

export const organizer = pgTable("organizers", {
  id: varchar("id", { length: 128 }).primaryKey(),
  personId: varchar("person_id", { length: 10 }).references(
    () => person.wcaId,
    {
      onDelete: "cascade",
    },
  ),
  status: varchar("status", {
    length: 50,
    enum: ["active", "inactive"],
  }).default("active"),
});

export type Organizer = InferSelectModel<typeof organizer>;

export const delegate = pgTable("delegates", {
  id: varchar("id", { length: 128 }).primaryKey(),
  personId: varchar("person_id", { length: 10 })
    .references(() => person.wcaId, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", {
    length: 50,
    enum: ["active", "inactive"],
  }).default("active"),
  level: varchar("level", {
    length: 50,
    enum: [
      "trainee_delegate",
      "junior_delegate",
      "full_delegate",
      "senior_delegate",
      "regional_delegate",
    ],
  }).default("trainee_delegate"),
});

export type Delegate = InferSelectModel<typeof delegate>;

export const competitionOrganizer = pgTable(
  "competition_organizers",
  {
    competitionId: varchar("competition_id", { length: 32 })
      .references(() => competition.id, { onDelete: "cascade" })
      .notNull(),
    organizerId: varchar("organizer_id", { length: 128 })
      .references(() => organizer.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.competitionId, t.organizerId] })],
);

export type CompetitionOrganizer = InferSelectModel<
  typeof competitionOrganizer
>;

export const competitionDelegate = pgTable(
  "competition_delegates",
  {
    competitionId: varchar("competition_id", { length: 32 })
      .references(() => competition.id, { onDelete: "cascade" })
      .notNull(),
    delegateId: varchar("delegate_id", { length: 128 })
      .references(() => delegate.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.competitionId, t.delegateId] })],
);

export type CompetitionDelegate = InferSelectModel<typeof competitionDelegate>;

export const rankAverage = pgTable(
  "ranks_average",
  {
    best: integer("best").notNull().default(0),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 6 })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    worldRank: integer("world_rank").notNull().default(0),
    continentRank: integer("continent_rank").notNull().default(0),
    countryRank: integer("country_rank").notNull().default(0),
    // Cubing México
    stateRank: integer("state_rank"),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.eventId] }),
    index("rank_avg_event_best_idx").on(t.eventId, t.best),
  ],
);

export type RankAverage = InferSelectModel<typeof rankAverage>;

export const rankSingle = pgTable(
  "ranks_single",
  {
    best: integer("best").notNull().default(0),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 6 })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    worldRank: integer("world_rank").notNull().default(0),
    continentRank: integer("continent_rank").notNull().default(0),
    countryRank: integer("country_rank").notNull().default(0),
    // Cubing México
    stateRank: integer("state_rank"),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.eventId] }),
    index("rank_sin_event_best_idx").on(t.eventId, t.best),
  ],
);

export type RankSingle = InferSelectModel<typeof rankSingle>;

export const result = pgTable(
  "results",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    pos: smallint("pos").default(0),
    /**
     * Combined rank across a Dual Round pair (WCA `global_pos`).
     * Equals `pos` for non-dual rounds.
     */
    globalPos: smallint("global_pos").notNull().default(0),
    /** True when this round belongs to a Dual (linked) Round pair. */
    isDual: boolean("is_dual").notNull().default(false),
    best: integer("best").notNull().default(0),
    average: integer("average").notNull().default(0),
    competitionId: varchar("competition_id", { length: 32 })
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    roundTypeId: varchar("round_type_id", { length: 1 }).references(
      () => roundType.id,
      { onDelete: "cascade" },
    ),
    eventId: varchar("event_id", { length: 6 })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    // personCountryId: varchar("personCountryId", { length: 50 }),
    formatId: varchar("format_id", { length: 1 }).notNull(),
    regionalSingleRecord: varchar("regional_single_record", { length: 3 }),
    regionalAverageRecord: varchar("regional_average_record", { length: 3 }),
    // Cubing México — historical state records
    stateSingleRecord: varchar("state_single_record", { length: 3 }),
    stateAverageRecord: varchar("state_average_record", { length: 3 }),
  },
  (t) => [
    index("results_comp_event_idx").on(t.competitionId, t.eventId),
    index("results_person_idx").on(t.personId),
    index("results_state_single_record_idx").on(t.stateSingleRecord),
    index("results_state_average_record_idx").on(t.stateAverageRecord),
  ],
);

export type Result = InferSelectModel<typeof result>;

export const resultAttempts = pgTable(
  "result_attempts",
  {
    value: integer("value").notNull().default(0),
    attemptNumber: smallint("attempt_number").notNull(),
    resultId: varchar("result_id", { length: 64 })
      .notNull()
      .references(() => result.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resultId, t.attemptNumber] })],
);

export type ResultAttempts = InferSelectModel<typeof resultAttempts>;

// Cubing Contests: unofficial events held at WCA competitions. Never part of
// the official/all event scopes.

export const ccEvent = pgTable("cc_events", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  format: varchar("format", {
    length: 10,
    enum: ["time", "number", "multi"],
  }).notNull(),
  rank: integer("rank").notNull().default(0),
  participants: smallint("participants").notNull().default(1),
});

export type CcEvent = InferSelectModel<typeof ccEvent>;

export const ccPerson = pgTable(
  "cc_persons",
  {
    id: integer("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    regionCode: varchar("region_code", { length: 2 }),
    wcaId: varchar("wca_id", { length: 10 }),
  },
  (t) => [index("cc_persons_wca_id_idx").on(t.wcaId)],
);

export type CcPerson = InferSelectModel<typeof ccPerson>;

export const ccResult = pgTable(
  "cc_results",
  {
    id: integer("id").primaryKey(),
    competitionId: varchar("competition_id", { length: 32 })
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 32 })
      .notNull()
      .references(() => ccEvent.id, { onDelete: "cascade" }),
    roundTypeId: varchar("round_type_id", { length: 1 }),
    roundNumber: smallint("round_number").notNull().default(1),
    formatId: varchar("format_id", { length: 1 }).notNull(),
    pos: smallint("pos"),
    best: integer("best").notNull().default(0),
    average: integer("average").notNull().default(0),
    attempts: integer("attempts").array().notNull(),
    date: timestamp("date").notNull(),
  },
  (t) => [index("cc_results_comp_event_idx").on(t.competitionId, t.eventId)],
);

export type CcResult = InferSelectModel<typeof ccResult>;

export const ccResultPerson = pgTable(
  "cc_result_persons",
  {
    resultId: integer("result_id")
      .notNull()
      .references(() => ccResult.id, { onDelete: "cascade" }),
    personId: integer("person_id")
      .notNull()
      .references(() => ccPerson.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.resultId, t.personId] }),
    index("cc_result_persons_person_idx").on(t.personId),
  ],
);

export type CcResultPerson = InferSelectModel<typeof ccResultPerson>;

// Cubing México

export const state = pgTable("states", {
  id: varchar("id", { length: 3 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});

export type State = InferSelectModel<typeof state>;

export const team = pgTable("teams", {
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  image: varchar("image", { length: 191 }),
  coverImage: varchar("cover_image", { length: 191 }),
  stateId: varchar("state_id", { length: 3 })
    .notNull()
    .references(() => state.id, { onDelete: "cascade" })
    .primaryKey(),
  founded: timestamp("founded"),
  socialLinks: jsonb("social_links").$type<{
    email?: string;
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  }>(),
  isActive: boolean("is_active").notNull().default(true),
});

export type Team = InferSelectModel<typeof team>;

export const teamMember = pgTable("team_members", {
  personId: varchar("person_id", { length: 10 })
    .notNull()
    .references(() => person.wcaId, {
      onDelete: "cascade",
    })
    .primaryKey(),
  specialties: jsonb("specialties").$type<string[]>(),
  achievements: jsonb("achievements").$type<string[]>(),
  role: varchar("role", { length: 20 }).$type<"admin" | "editor">(),
});

export type TeamMember = InferSelectModel<typeof teamMember>;

export const teamAchievement = pgTable("team_achievements", {
  stateId: varchar("state_id", { length: 3 })
    .notNull()
    .references(() => state.id, { onDelete: "cascade" })
    .primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
});

export type TeamAchievement = InferSelectModel<typeof teamAchievement>;

export const sumOfRanks = pgTable(
  "sum_of_ranks",
  {
    rank: integer("rank").notNull(),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    resultType: varchar("result_type", { length: 7 }).notNull(),
    scope: varchar("scope", { length: 8 }).notNull().default("official"),
    overall: integer("overall").notNull(),
    events: jsonb("events").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personId, t.resultType, t.scope] })],
);

export type SumOfRanks = InferSelectModel<typeof sumOfRanks>;

export const kinchRanks = pgTable(
  "kinch_ranks",
  {
    rank: integer("rank").notNull(),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 8 }).notNull().default("official"),
    overall: doublePrecision("overall").notNull(),
    events: jsonb("events").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personId, t.scope] })],
);

export type KinchRanks = InferSelectModel<typeof kinchRanks>;

export const streakRanks = pgTable(
  "streak_ranks",
  {
    rank: integer("rank").notNull(),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 8 }).notNull().default("official"),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.personId, t.scope] })],
);

export type StreakRanks = InferSelectModel<typeof streakRanks>;

export const nemesisStats = pgTable(
  "nemesis_stats",
  {
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 8 }).notNull().default("official"),
    nemesisCount: integer("nemesis_count").notNull().default(0),
    nemesizedCount: integer("nemesized_count").notNull().default(0),
    eventCount: integer("event_count").notNull().default(0),
    slotCount: integer("slot_count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.scope] }),
    index("nemesis_stats_nemesis_count_idx").on(t.scope, t.nemesisCount),
    index("nemesis_stats_nemesized_count_idx").on(t.scope, t.nemesizedCount),
  ],
);

export type NemesisStats = InferSelectModel<typeof nemesisStats>;

export const exportMetadata = pgTable("export_metadata", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type JobRunStep = {
  name: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  startedAt: string | null;
  finishedAt: string | null;
  result?: unknown;
  error?: string;
};

export const jobRun = pgTable(
  "job_runs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    job: varchar("job", { length: 40 }).notNull(),
    status: varchar("status", { length: 12 })
      .$type<"running" | "succeeded" | "failed">()
      .notNull(),
    steps: jsonb("steps").$type<JobRunStep[]>().notNull().default([]),
    resumedFrom: varchar("resumed_from", { length: 36 }),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [index("job_runs_job_started_idx").on(t.job, t.startedAt)],
);

export type JobRun = InferSelectModel<typeof jobRun>;

export const socialPost = pgTable(
  "social_posts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    postType: varchar("post_type", { length: 20 }).notNull(),
    subjectKey: varchar("subject_key", { length: 128 }).notNull(),
    competitionId: varchar("competition_id", { length: 32 }).references(
      () => competition.id,
      { onDelete: "cascade" },
    ),
    platform: varchar("platform", { length: 20 }).notNull(),
    externalId: varchar("external_id", { length: 64 }),
    postedAt: timestamp("posted_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("social_posts_type_subject_platform_idx").on(
      t.postType,
      t.subjectKey,
      t.platform,
    ),
    index("social_posts_competition_idx").on(t.competitionId),
    index("social_posts_post_type_idx").on(t.postType),
  ],
);

export type SocialPost = InferSelectModel<typeof socialPost>;

export const groupKindEnum = ["community", "sponsor"] as const;
export type GroupKind = (typeof groupKindEnum)[number];

export const sponsorshipStatusEnum = ["inactive", "active", "expired"] as const;
export type SponsorshipStatus = (typeof sponsorshipStatusEnum)[number];

export type GroupSocialLinks = {
  email?: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
};

/** Non-state orgs: local communities and paid sponsor teams. */
export const group = pgTable(
  "groups",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    kind: varchar("kind", {
      length: 16,
      enum: groupKindEnum,
    }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    description: text("description"),
    image: varchar("image", { length: 191 }),
    coverImage: varchar("cover_image", { length: 191 }),
    founded: timestamp("founded"),
    socialLinks: jsonb("social_links").$type<GroupSocialLinks>(),
    isActive: boolean("is_active").notNull().default(true),
    /** Community region label, e.g. metro area spanning multiple states. */
    regionLabel: varchar("region_label", { length: 120 }),
    websiteUrl: varchar("website_url", { length: 200 }),
    sponsorshipStatus: varchar("sponsorship_status", {
      length: 16,
      enum: sponsorshipStatusEnum,
    })
      .notNull()
      .default("inactive"),
    sponsorshipExpiresAt: timestamp("sponsorship_expires_at"),
    publicityEnabled: boolean("publicity_enabled").notNull().default(false),
    publicityBlurb: varchar("publicity_blurb", { length: 240 }),
  },
  (t) => [
    index("groups_kind_idx").on(t.kind),
    index("groups_sponsorship_status_idx").on(t.sponsorshipStatus),
  ],
);

export type Group = InferSelectModel<typeof group>;

export const groupMembership = pgTable(
  "group_memberships",
  {
    groupId: varchar("group_id", { length: 32 })
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    specialties: jsonb("specialties").$type<string[]>(),
    achievements: jsonb("achievements").$type<string[]>(),
    role: varchar("role", { length: 20 }).$type<"admin" | "editor">(),
    hideFromRoster: boolean("hide_from_roster").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.personId] }),
    index("group_memberships_person_idx").on(t.personId),
  ],
);

export type GroupMembership = InferSelectModel<typeof groupMembership>;

export const groupRankSingle = pgTable(
  "group_ranks_single",
  {
    groupId: varchar("group_id", { length: 32 })
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 6 })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    best: integer("best").notNull().default(0),
    groupRank: integer("group_rank").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.personId, t.eventId] }),
    index("group_ranks_single_event_idx").on(t.groupId, t.eventId, t.groupRank),
  ],
);

export type GroupRankSingle = InferSelectModel<typeof groupRankSingle>;

export const groupRankAverage = pgTable(
  "group_ranks_average",
  {
    groupId: varchar("group_id", { length: 32 })
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 6 })
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    best: integer("best").notNull().default(0),
    groupRank: integer("group_rank").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.personId, t.eventId] }),
    index("group_ranks_average_event_idx").on(
      t.groupId,
      t.eventId,
      t.groupRank,
    ),
  ],
);

export type GroupRankAverage = InferSelectModel<typeof groupRankAverage>;

export const groupRecordMarker = pgTable(
  "group_record_markers",
  {
    groupId: varchar("group_id", { length: 32 })
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    resultId: varchar("result_id", { length: 64 })
      .notNull()
      .references(() => result.id, { onDelete: "cascade" }),
    recordType: varchar("record_type", {
      length: 8,
      enum: ["single", "average"],
    }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.resultId, t.recordType] }),
    index("group_record_markers_result_idx").on(t.resultId),
  ],
);

export type GroupRecordMarker = InferSelectModel<typeof groupRecordMarker>;

export const designModuleEnum = [
  "certificate_podium",
  "certificate_participation",
  "badges",
] as const;

export type DesignModule = (typeof designModuleEnum)[number];

export const designOwnerScopeEnum = ["user", "org", "global"] as const;

export type DesignOwnerScope = (typeof designOwnerScopeEnum)[number];

/** Organización certificate/badge designs and shared templates (no FK to competitions). */
export const design = pgTable(
  "designs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    competitionId: varchar("competition_id", { length: 32 }),
    userId: varchar("user_id", { length: 64 }).notNull(),
    module: varchar("module", { length: 32 }).$type<DesignModule>().notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    json: jsonb("json").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    ownerScope: varchar("owner_scope", { length: 16 })
      .$type<DesignOwnerScope>()
      .notNull()
      .default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("designs_competition_module_idx").on(t.competitionId, t.module),
    index("designs_owner_scope_idx").on(t.ownerScope, t.isPublic),
    index("designs_user_idx").on(t.userId),
  ],
);

export type Design = InferSelectModel<typeof design>;

/**
 * Published participation-certificate claim links.
 * Competitors open `/claim/{token}`, sign in with WCA, and download only their PDF.
 * Unique on (competitionId, module) so republish keeps a stable token.
 */
export const certificateShare = pgTable(
  "certificate_shares",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    token: varchar("token", { length: 64 }).notNull(),
    competitionId: varchar("competition_id", { length: 32 }).notNull(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    module: varchar("module", { length: 32 }).$type<DesignModule>().notNull(),
    json: jsonb("json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("certificate_shares_token_uidx").on(t.token),
    uniqueIndex("certificate_shares_competition_module_uidx").on(
      t.competitionId,
      t.module,
    ),
  ],
);

export type CertificateShare = InferSelectModel<typeof certificateShare>;

// Cubing México yearly goals ("Metas"). Targets are validated in apps/web/lib/goals/types.ts.

export const goalTypeEnum = [
  "result",
  "rank",
  "count",
  "mollerz",
  "nemesis",
  "kinch",
  "sor",
  "custom",
] as const;

export type GoalType = (typeof goalTypeEnum)[number];

export type GoalTarget =
  | {
      type: "result";
      eventId: string;
      kind: "single" | "average";
      /** WCA-encoded value the result has to beat (strictly lower). */
      value: number;
    }
  | {
      type: "rank";
      eventId: string;
      kind: "single" | "average";
      region: "national" | "state";
      maxRank: number;
    }
  | {
      type: "count";
      metric:
        | "competitions"
        | "podiums"
        | "wins"
        | "states"
        | "newStates"
        | "events"
        | "prs"
        | "records";
      value: number;
      /** Only for "podiums": count podiums in this event alone. */
      eventId?: string;
    }
  | {
      type: "mollerz";
      tier: "Diamante" | "Ópalo" | "Platino" | "Oro" | "Plata" | "Bronce";
    }
  | { type: "nemesis"; maxNemeses: number }
  | { type: "kinch"; minScore: number }
  | { type: "sor"; kind: "single" | "average"; maxSum: number }
  | { type: "custom"; text: string };

export const goal = pgTable(
  "goals",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    type: varchar("type", { length: 16 }).$type<GoalType>().notNull(),
    target: jsonb("target").$type<GoalTarget>().notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    /** Set by the owner on custom goals; other types are evaluated from results. */
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("goals_person_year_idx").on(t.personId, t.year)],
);

export type Goal = InferSelectModel<typeof goal>;
