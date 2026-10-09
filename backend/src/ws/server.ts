import type { Server } from 'node:http'
import type { matches } from '../schema/matches.ts'
import { WebSocket, WebSocketServer } from 'ws'

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

export function attachWebSocketServer(server: Server) {
	const wss = new WebSocketServer({
		server,
		path: '/ws',
		maxPayload: MAX_PAYLOAD
	})

	wss.on('connection', ws => {
		sendJson(ws, { type: 'welcome' })

		ws.on('error', console.error)
	})

	function broadcastMatchCreated(match: Match) {
		broadcast(wss, { type: 'match_created', data: match })
	}

	return { broadcastMatchCreated }
}
