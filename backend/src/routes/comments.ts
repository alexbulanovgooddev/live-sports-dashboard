import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { matchIdParamSchema } from '../validation/matches.ts'
import {
	createCommentSchema,
	listCommentsQuerySchema
} from '../validation/comments.ts'
import { db } from '../db/index.ts'
import { comments } from '../schema/comments.ts'

const DEFAULT_LIMIT = 50

// код Postgres для нарушения внешнего ключа
const FOREIGN_KEY_VIOLATION = '23503'

function isForeignKeyViolation(error: unknown) {
	// drizzle оборачивает ошибку драйвера, исходная лежит в cause
	const source = error instanceof Error ? (error.cause ?? error) : error

	return (
		typeof source === 'object' &&
		source !== null &&
		'code' in source &&
		source.code === FOREIGN_KEY_VIOLATION
	)
}

export const commentsRouter = Router({ mergeParams: true })

commentsRouter.get('/', async (req, res) => {
	const params = matchIdParamSchema.safeParse(req.params)

	if (!params.success) {
		return res.status(400).json({
			error: 'Invalid match ID.',
			details: params.error.issues
		})
	}

	const query = listCommentsQuerySchema.safeParse(req.query)

	if (!query.success) {
		return res.status(400).json({
			error: 'Invalid query.',
			details: query.error.issues
		})
	}

	const limit = query.data.limit ?? DEFAULT_LIMIT

	try {
		const data = await db
			.select()
			.from(comments)
			.where(eq(comments.matchId, params.data.id))
			.orderBy(desc(comments.createdAt))
			.limit(limit)

		res.json({ data })
	} catch (error) {
		console.error('Failed to get comments', error)
		res.status(500).json({ error: 'Failed to get comments.' })
	}
})

commentsRouter.post('/', async (req, res) => {
	const params = matchIdParamSchema.safeParse(req.params)

	if (!params.success) {
		return res.status(400).json({
			error: 'Invalid match ID.',
			details: params.error.issues
		})
	}

	const parsed = createCommentSchema.safeParse(req.body)

	if (!parsed.success) {
		return res.status(400).json({
			error: 'Invalid payload.',
			details: parsed.error.issues
		})
	}

	try {
		const [comment] = await db
			.insert(comments)
			.values({ ...parsed.data, matchId: params.data.id })
			.returning()

		res.status(201).json({ data: comment })

		try {
			res.app.locals.broadcastCommentCreated?.(comment)
		} catch (error) {
			console.error('Failed to broadcast comment_created', error)
		}
	} catch (error) {
		if (isForeignKeyViolation(error)) {
			return res.status(404).json({ error: 'Match not found.' })
		}

		console.error('Failed to create comment', error)
		res.status(500).json({ error: 'Failed to create comment.' })
	}
})
