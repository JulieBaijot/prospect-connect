import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { enrichCompanyServer, findEmailServer, searchCompaniesBatchServer } from "./prospect-search.server";

const sourceSchema = z.enum(["pappers", "insee", "annuaire"]);

const searchSchema = z.object({
  source: sourceSchema,
  filters: z.object({
    keywords: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
    departments: z.array(z.string().trim().regex(/^\d{2,3}$/)).max(20),
    headcounts: z.array(z.string().trim()).max(8),
    sector: z.string().trim().max(120),
    legal: z.string().trim().max(80),
    limit: z.number().int().min(1).max(25),
  }),
});

const enrichSchema = z.object({
  name: z.string().trim().min(1).max(180),
  city: z.string().trim().max(120).optional(),
});

const emailSchema = z.object({
  domain: z.string().trim().max(180).optional(),
  company: z.string().trim().max(180).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(120).optional(),
});

export const searchCompaniesBatch = createServerFn({ method: "POST" })
  .inputValidator((data) => searchSchema.parse(data))
  .handler(async ({ data }) => searchCompaniesBatchServer(data));

export const enrichCompany = createServerFn({ method: "POST" })
  .inputValidator((data) => enrichSchema.parse(data))
  .handler(async ({ data }) => enrichCompanyServer(data));

export const findEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => emailSchema.parse(data))
  .handler(async ({ data }) => findEmailServer(data));
