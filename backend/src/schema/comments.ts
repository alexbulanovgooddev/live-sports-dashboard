import {
	pgTable,
	serial,
	text,
	integer,
	timestamp,
	jsonb,
	index
} from 'drizzle-orm/pg-core'

import { matches } from './matches.ts'

export const comments = pgTable(
	'comments',
	{
		id: serial('id').primaryKey(),
		matchId: integer('match_id')
			.notNull()
			.references(() => matches.id, { onDelete: 'cascade' }),
		minute: integer('minute'),
		sequence: integer('sequence'),
		period: text('period'),
		eventType: text('event_type'),
		actor: text('actor'),
		team: text('team'),
		message: text('message').notNull(),
		metadata: jsonb('metadata'),
		tags: text('tags').array(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		index('comments_match_id_created_at_idx').on(table.matchId, table.createdAt)
	]
)
