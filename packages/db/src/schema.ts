import { type InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  smallint,
  integer,
  primaryKey,
  timestamp,
  doublePrecision,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
  },
  (t) => [
    index("person_name_idx").on(t.name),
    index("person_state_idx").on(t.stateId),
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
    overall: integer("overall").notNull(),
    events: jsonb("events").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personId, t.resultType] })],
);

export type SumOfRanks = InferSelectModel<typeof sumOfRanks>;

export const kinchRanks = pgTable(
  "kinch_ranks",
  {
    rank: integer("rank").notNull(),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    overall: doublePrecision("overall").notNull(),
    events: jsonb("events").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personId] })],
);

export type KinchRanks = InferSelectModel<typeof kinchRanks>;

export const streakRanks = pgTable(
  "streak_ranks",
  {
    rank: integer("rank").notNull(),
    personId: varchar("person_id", { length: 10 })
      .notNull()
      .references(() => person.wcaId, { onDelete: "cascade" }),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.personId] })],
);

export type StreakRanks = InferSelectModel<typeof streakRanks>;

export const exportMetadata = pgTable("export_metadata", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const sponsor = pgTable("sponsors", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  logo: varchar("logo", { length: 191 }),
  socialLinks: jsonb("social_links").$type<{
    email?: string;
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  }>(),
  active: boolean("active").notNull().default(false),
});

export type Sponsor = InferSelectModel<typeof sponsor>;

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
