import { z } from "zod";
import validator from "validator";
import { GROUP_ID_REGEX } from "@/lib/groups";

export const groupFormSchema = z.object({
  groupId: z.string().min(1).max(32),
  name: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(50, { message: "El nombre debe tener como máximo 50 caracteres" }),
  description: z
    .string()
    .max(1000, {
      message: "La descripción debe tener como máximo 1000 caracteres",
    })
    .nullable(),
  regionLabel: z.string().max(120).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  stateId: z
    .string()
    .max(3)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  latitude: z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null || value === "") return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }),
  longitude: z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null || value === "") return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }),
  websiteUrl: z
    .string()
    .refine(
      (value) =>
        value === null ||
        value === "" ||
        z.string().url().safeParse(value).success,
      { message: "Debe ser una URL válida" },
    )
    .optional()
    .nullable(),
  publicityBlurb: z.string().max(240).optional().nullable(),
  email: z
    .string()
    .refine(
      (value) =>
        value === null ||
        value === "" ||
        z.string().email().safeParse(value).success,
      { message: "Debe ser un correo electrónico válido" },
    )
    .optional(),
  whatsapp: z
    .string()
    .refine(
      (value) =>
        value === null || value === "" || validator.isMobilePhone(value),
      {
        message:
          "Debe ser un número de teléfono móvil válido, asegúrate que no contenga espacios",
      },
    )
    .optional(),
  facebook: z
    .string()
    .refine(
      (value) =>
        value === null ||
        value === "" ||
        z.string().url().safeParse(value).success,
      { message: "Debe ser una URL válida" },
    )
    .optional(),
  instagram: z
    .string()
    .refine(
      (value) =>
        value === null ||
        value === "" ||
        z.string().url().safeParse(value).success,
      { message: "Debe ser una URL válida" },
    )
    .optional(),
  twitter: z
    .string()
    .refine(
      (value) =>
        value === null ||
        value === "" ||
        z.string().url().safeParse(value).success,
      { message: "Debe ser una URL válida" },
    )
    .optional(),
  tiktok: z
    .string()
    .refine(
      (value) =>
        value === null ||
        value === "" ||
        z.string().url().safeParse(value).success,
      { message: "Debe ser una URL válida" },
    )
    .optional(),
  founded: z.string().optional(),
  isActive: z.string().optional(),
});

export const addGroupMemberFormSchema = z.object({
  groupId: z.string().min(1),
  personId: z.string().min(10, {
    message: "Selecciona una persona",
  }),
  specialties: z.string().optional(),
});

export const createGroupSchema = z.object({
  id: z.string().min(2).max(32).regex(GROUP_ID_REGEX, {
    message: "Usa solo minúsculas, números y guiones",
  }),
  kind: z.enum(["community", "sponsor"]),
  name: z.string().min(2).max(50),
  description: z.string().max(1000).optional().nullable(),
  regionLabel: z.string().max(120).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export const setSponsorshipSchema = z.object({
  groupId: z.string().min(1),
  sponsorshipStatus: z.enum(["inactive", "active", "expired"]),
  publicityEnabled: z.boolean().optional(),
  sponsorshipExpiresAt: z.string().optional().nullable(),
});
