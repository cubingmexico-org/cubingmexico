import { relations } from "drizzle-orm";
import {
  competition,
  championship,
  competitionEvent,
  competitionOrganizer,
  competitionDelegate,
  result,
  state,
  person,
  event,
  rankAverage,
  rankSingle,
  organizer,
  delegate,
  teamMember,
  resultAttempts,
  team,
} from "./schema";

export const competitionRelations = relations(competition, ({ many, one }) => ({
  championships: many(championship),
  competitionEvents: many(competitionEvent),
  organizers: many(competitionOrganizer),
  delegates: many(competitionDelegate),
  results: many(result),
  state: one(state, { fields: [competition.stateId], references: [state.id] }),
}));

export const personRelations = relations(person, ({ many, one }) => ({
  results: many(result),
  ranksAverage: many(rankAverage),
  ranksSingle: many(rankSingle),
  organizerProfile: one(organizer, {
    fields: [person.wcaId],
    references: [organizer.personId],
  }),
  delegateProfile: one(delegate, {
    fields: [person.wcaId],
    references: [delegate.personId],
  }),
  teamMember: one(teamMember, {
    fields: [person.wcaId],
    references: [teamMember.personId],
  }),
  state: one(state, { fields: [person.stateId], references: [state.id] }),
}));

export const resultRelations = relations(result, ({ one, many }) => ({
  competition: one(competition, {
    fields: [result.competitionId],
    references: [competition.id],
  }),
  person: one(person, {
    fields: [result.personId],
    references: [person.wcaId],
  }),
  event: one(event, { fields: [result.eventId], references: [event.id] }),
  attempts: many(resultAttempts),
}));

export const resultAttemptsRelations = relations(resultAttempts, ({ one }) => ({
  result: one(result, {
    fields: [resultAttempts.resultId],
    references: [result.id],
  }),
}));

export const stateRelations = relations(state, ({ many, one }) => ({
  competitions: many(competition),
  persons: many(person),
  team: one(team, { fields: [state.id], references: [team.stateId] }),
}));
