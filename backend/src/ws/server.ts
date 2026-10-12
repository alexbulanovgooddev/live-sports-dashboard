import type { Server } from 'node:http'
import type { Duplex } from 'node:stream'
import type { matches } from '../schema/matches.ts'
import type { comments } from '../schema/comments.ts'
import type { RawData } from 'ws'
import { WebSocket, WebSocketServer } from 'ws'
import { wsArcjet } from '../arcjet.ts'

type Match = typeof matches.$inferSelect
type Comment = typeof comments.$inferSelect

const MAX_PAYLOAD = 1024 * 1024

const matchSubscribers = new Map<number, Set<WebSocket>>()
const socketSubscriptions = new WeakMap<WebSocket, Set<number>>()

function subscribe(matchId: number, socket: WebSocket) {
	let subscribers = matchSubscribers.get(matchId)

	if (!subscribers) {
		subscribers = new Set()
		matchSubscribers.set(matchId, subscribers)
	}

	subscribers.add(socket)

	let subscriptions = socketSubscriptions.get(socket)

	if (!subscriptions) {
		subscriptions = new Set()
		socketSubscriptions.set(socket, subscriptions)
	}

	subscriptions.add(matchId)
}

function unsubscribe(matchId: number, socket: WebSocket) {
	socketSubscriptions.get(socket)?.delete(matchId)

	const subscribers = matchSubscribers.get(matchId)

	if (!subscribers) {
		return
	}

	subscribers.delete(socket)

	if (subscribers.size === 0) {
		matchSubscribers.delete(matchId)
	}
}

function cleanupSubscriptions(socket: WebSocket) {
	const subscriptions = socketSubscriptions.get(socket)

	if (!subscriptions) return

	for (const matchId of subscriptions) {
		unsubscribe(matchId, socket)
	}

	socketSubscriptions.delete(socket)
}

function handleMessage(socket: WebSocket, data: RawData) {
	let message

	try {
		message = JSON.parse(data.toString())
	} catch {
		sendJson(socket, { type: 'error', message: 'Invalid JSON' })

		return
	}

	if (!Number.isInteger(message?.matchId)) return

	if (message.type === 'subscribe') {
		subscribe(message.matchId, socket)
		sendJson(socket, { type: 'subscribed', matchId: message.matchId })
	} else if (message.type === 'unsubscribe') {
		unsubscribe(message.matchId, socket)
		sendJson(socket, { type: 'unsubscribed', matchId: message.matchId })
	}
}

function sendJson(socket: WebSocket, payload: unknown) {
	if (socket.readyState !== WebSocket.OPEN) return

	socket.send(JSON.stringify(payload))
}

function broadcastToAll(wss: WebSocketServer, payload: unknown) {
	const message = JSON.stringify(payload)
	for (const client of wss.clients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message)
		}
	}
}

function broadcastToMatch(matchId: number, payload: unknown) {
	const subscribers = matchSubscribers.get(matchId)

	if (!subscribers) return

	const message = JSON.stringify(payload)

	for (const client of subscribers) {
		if (client.readyState !== WebSocket.OPEN) continue

		client.send(message)
	}
}

function rejectUpgrade(socket: Duplex, status: number, message: string) {
	socket.end(
		`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`
	)
}

export function attachWebSocketServer(server: Server) {
	const wss = new WebSocketServer({
		noServer: true,
		path: '/ws',
		maxPayload: MAX_PAYLOAD
	})

	server.on('upgrade', async (req, socket, head) => {
		socket.on('error', console.error)

		if (!wss.shouldHandle(req)) {
			rejectUpgrade(socket, 400, 'Bad Request')

			return
		}

		try {
			const decision = await wsArcjet.protect(req)

			if (decision.isDenied()) {
				if (decision.reason.isRateLimit()) {
					rejectUpgrade(socket, 429, 'Too Many Requests')
				} else {
					rejectUpgrade(socket, 403, 'Forbidden')
				}

				return
			}
		} catch (error) {
			console.error('WS upgrade security error', error)
			rejectUpgrade(socket, 503, 'Service Unavailable')

			return
		}

		socket.off('error', console.error)

		wss.handleUpgrade(req, socket, head, ws => {
			wss.emit('connection', ws, req)
		})
	})

	wss.on('connection', ws => {
		ws.on('error', console.error)

		ws.on('close', () => cleanupSubscriptions(ws))

		sendJson(ws, { type: 'welcome' })

		ws.on('message', data => {
			handleMessage(ws, data)
		})
	})

	function broadcastMatchCreated(match: Match) {
		broadcastToAll(wss, { type: 'match_created', data: match })
	}

	function broadcastCommentCreated(comment: Comment) {
		broadcastToMatch(comment.matchId, {
			type: 'comment_created',
			data: comment
		})
	}

	return { broadcastMatchCreated, broadcastCommentCreated }
}
