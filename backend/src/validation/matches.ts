import { z } from 'zod'

import { matchStatusEnum } from '../schema/matches.ts'

type MatchStatus = (typeof matchStatusEnum.enumValues)[number]

export const MATCH_STATUS = {
	SCHEDULED: 'scheduled',
	LIVE: 'live',
	FINISHED: 'finished'
} as const satisfies Record<string, MatchStatus>

// верхняя граница integer/serial в Postgres
const INT4_MAX = 2_147_483_647

export const MAX_LIST_LIMIT = 100

const nameSchema = z.string().trim().min(1).max(100)
const scoreSchema = z.number().int().nonnegative().max(INT4_MAX)

export const listMatchesQuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(MAX_LIST_LIMIT).optional()
})

export const matchIdParamSchema = z.object({
	id: z.coerce.number().int().positive().max(INT4_MAX)
})

export const createMatchSchema = z
	.object({
		sport: nameSchema,
		homeTeam: nameSchema,
		awayTeam: nameSchema,
		startTime: z.iso.datetime({ offset: true }),
		endTime: z.iso.datetime({ offset: true }),
		homeScore: scoreSchema.optional(),
		awayScore: scoreSchema.optional()
	})
	.refine(data => new Date(data.endTime) > new Date(data.startTime), {
		message: 'endTime must be chronologically after startTime',
		path: ['endTime']
	})

export const updateScoreSchema = z.object({
	homeScore: scoreSchema,
	awayScore: scoreSchema
})
