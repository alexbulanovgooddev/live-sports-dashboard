import type { matches } from '../schema/matches.ts'
import { MATCH_STATUS } from '../validation/matches.ts'

type Match = typeof matches.$inferSelect
type MatchStatus = Match['status']
type DateInput = Date | string | null | undefined

export function getMatchStatus(
	startTime: DateInput,
	endTime: DateInput,
	now: Date = new Date()
): MatchStatus | null {
	// new Date(null) — валидная дата (эпоха), поэтому отсекаем заранее
	if (startTime == null || endTime == null) {
		return null
	}

	const start = new Date(startTime)
	const end = new Date(endTime)

	if (
		Number.isNaN(start.getTime()) ||
		Number.isNaN(end.getTime()) ||
		Number.isNaN(now.getTime())
	) {
		return null
	}

	if (now < start) {
		return MATCH_STATUS.SCHEDULED
	}

	if (now >= end) {
		return MATCH_STATUS.FINISHED
	}

	return MATCH_STATUS.LIVE
}

export async function syncMatchStatus(
	match: Pick<Match, 'startTime' | 'endTime' | 'status'>,
	updateStatus: (status: MatchStatus) => Promise<unknown>
): Promise<MatchStatus> {
	const nextStatus = getMatchStatus(match.startTime, match.endTime)
	if (!nextStatus) {
		return match.status
	}
	if (match.status !== nextStatus) {
		await updateStatus(nextStatus)
		match.status = nextStatus
	}
	return match.status
}
