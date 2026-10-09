import { Router } from 'express'
import { desc } from 'drizzle-orm'
import {
	listMatchesQuerySchema,
	createMatchSchema,
	MATCH_STATUS
} from '../validation/matches.ts'
import { db } from '../db/index.ts'
import { matches } from '../schema/matches.ts'
import { getMatchStatus } from '../utils/match-status.ts'

const DEFAULT_LIMIT = 50

export const matchesRouter = Router()

matchesRouter.get('/', async (req, res) => {
	const parsed = listMatchesQuerySchema.safeParse(req.query)

	if (!parsed.success) {
		return res.status(400).json({
			error: 'Invalid query.',
			details: parsed.error.issues
		})
	}

	const limit = parsed.data.limit ?? DEFAULT_LIMIT

	try {
		const rows = await db
			.select()
			.from(matches)
			.orderBy(desc(matches.createdAt))
			.limit(limit)

		const data = rows.map(match => ({
			...match,
			status: getMatchStatus(match.startTime, match.endTime) ?? match.status
		}))

		res.json({ data })
	} catch (error) {
		console.error('Failed to get matches', error)
		res.status(500).json({ error: 'Failed to get matches.' })
	}
})

matchesRouter.post('/', async (req, res) => {
	const parsed = createMatchSchema.safeParse(req.body)

	if (!parsed.success) {
		return res.status(400).json({
			error: 'Invalid payload.',
			details: parsed.error.issues
		})
	}

	const {
		data: { startTime, endTime, homeScore, awayScore }
	} = parsed

	try {
		const [event] = await db
			.insert(matches)
			.values({
				...parsed.data,
				startTime: new Date(startTime),
				endTime: new Date(endTime),
				homeScore: homeScore ?? 0,
				awayScore: awayScore ?? 0,
				status: getMatchStatus(startTime, endTime) ?? MATCH_STATUS.SCHEDULED
			})
			.returning()

		res.status(201).json({ data: event })

		try {
			res.app.locals.broadcastMatchCreated?.(event)
		} catch (error) {
			console.error('Failed to broadcast match_created', error)
		}
	} catch (error) {
		console.error('Failed to create match', error)
		res.status(500).json({ error: 'Failed to create match.' })
	}
})
