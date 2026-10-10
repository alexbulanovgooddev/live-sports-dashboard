import type { Server } from 'node:http'
import type { Duplex } from 'node:stream'
import type { matches } from '../schema/matches.ts'
import { WebSocket, WebSocketServer } from 'ws'
import { wsArcjet } from '../arcjet.ts'

type Match = typeof matches.$inferSelect

const MAX_PAYLOAD = 1024 * 1024

function sendJson(socket: WebSocket, payload: unknown) {
	if (socket.readyState !== WebSocket.OPEN) return

	socket.send(JSON.stringify(payload))
}

function broadcast(wss: WebSocketServer, payload: unknown) {
	const message = JSON.stringify(payload)
	for (const client of wss.clients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message)
		}
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

		sendJson(ws, { type: 'welcome' })
	})

	function broadcastMatchCreated(match: Match) {
		broadcast(wss, { type: 'match_created', data: match })
	}

	return { broadcastMatchCreated }
}
