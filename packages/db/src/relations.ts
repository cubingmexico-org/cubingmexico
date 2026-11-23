import { relations } from "drizzle-orm";
import {
  competition,
  championship,
  competitionEvent,
  competitionOrganizer,
  competitionDelegate,
  competitionRoundDate,
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
  group,
  groupMembership,
  groupRankSingle,
  groupRankAverage,
  groupRecordMarker,
} from "./schema";

export const competitionRelations = relations(competition, ({ many, one }) => ({
  championships: many(championship),
  competitionEvents: many(competitionEvent),
  organizers: many(competitionOrganizer),
  delegates: many(competitionDelegate),
  results: many(result),
  roundDates: many(competitionRoundDate),
  state: one(state, { fields: [competition.stateId], references: [state.id] }),
}));

export const competitionRoundDateRelations = relations(
  competitionRoundDate,
  ({ one }) => ({
    competition: one(competition, {
      fields: [competitionRoundDate.competitionId],
      references: [competition.id],
    }),
    event: one(event, {
      fields: [competitionRoundDate.eventId],
      references: [event.id],
    }),
  }),
);

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
  groupMemberships: many(groupMembership),
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
  groupRecordMarkers: many(groupRecordMarker),
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

export const groupRelations = relations(group, ({ many }) => ({
  memberships: many(groupMembership),
  ranksSingle: many(groupRankSingle),
  ranksAverage: many(groupRankAverage),
  recordMarkers: many(groupRecordMarker),
}));

export const groupMembershipRelations = relations(
  groupMembership,
  ({ one }) => ({
    group: one(group, {
      fields: [groupMembership.groupId],
      references: [group.id],
    }),
    person: one(person, {
      fields: [groupMembership.personId],
      references: [person.wcaId],
    }),
  }),
);

export const groupRankSingleRelations = relations(
  groupRankSingle,
  ({ one }) => ({
    group: one(group, {
      fields: [groupRankSingle.groupId],
      references: [group.id],
    }),
    person: one(person, {
      fields: [groupRankSingle.personId],
      references: [person.wcaId],
    }),
    event: one(event, {
      fields: [groupRankSingle.eventId],
      references: [event.id],
    }),
  }),
);

export const groupRankAverageRelations = relations(
  groupRankAverage,
  ({ one }) => ({
    group: one(group, {
      fields: [groupRankAverage.groupId],
      references: [group.id],
    }),
    person: one(person, {
      fields: [groupRankAverage.personId],
      references: [person.wcaId],
    }),
    event: one(event, {
      fields: [groupRankAverage.eventId],
      references: [event.id],
    }),
  }),
);

export const groupRecordMarkerRelations = relations(
  groupRecordMarker,
  ({ one }) => ({
    group: one(group, {
      fields: [groupRecordMarker.groupId],
      references: [group.id],
    }),
    result: one(result, {
      fields: [groupRecordMarker.resultId],
      references: [result.id],
    }),
  }),
);
