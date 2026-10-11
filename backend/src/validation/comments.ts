import { z } from 'zod'

import { INT4_MAX, MAX_LIST_LIMIT } from './matches.ts'

const MAX_MESSAGE_LENGTH = 2000
const MAX_TAGS = 20

const labelSchema = z.string().trim().min(1).max(100)
const counterSchema = z.number().int().nonnegative().max(INT4_MAX)

export const listCommentsQuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(MAX_LIST_LIMIT).optional()
})

export const createCommentSchema = z.object({
	minute: counterSchema,
	sequence: counterSchema.optional(),
	period: labelSchema.optional(),
	eventType: labelSchema.optional(),
	actor: labelSchema.optional(),
	team: labelSchema.optional(),
	message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
	metadata: z.record(z.string(), z.unknown()).optional(),
	tags: z.array(labelSchema).max(MAX_TAGS).optional()
})
