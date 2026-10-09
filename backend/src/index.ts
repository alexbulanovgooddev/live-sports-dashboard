import { createServer } from 'node:http'
import express, { type ErrorRequestHandler } from 'express'
import { matchesRouter } from './routes/matches.ts'
import { attachWebSocketServer } from './ws/server.ts'

const PORT = Number(process.env.PORT) || 8000
const HOST = process.env.HOST || '0.0.0.0'

const app = express()

const server = createServer(app)

app.use(express.json())

app.get('/health', (req, res) => {
	res.json({ status: 'ok' })
})

app.use('/matches', matchesRouter)

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
	if (res.headersSent) {
		return next(err)
	}

	// ошибки body-parser (битый JSON, слишком большое тело) несут свой 4xx
	const status = Number(err?.status ?? err?.statusCode)
	if (status >= 400 && status < 500) {
		return res.status(status).json({ error: 'Invalid request.' })
	}

	console.error(err)
	res.status(500).json({ error: 'Internal server error.' })
}

app.use(errorHandler)

const { broadcastMatchCreated } = attachWebSocketServer(server)
app.locals.broadcastMatchCreated = broadcastMatchCreated

server.listen(PORT, HOST, () => {
	const baseUrl =
		HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`
	console.log(`Server is running on ${baseUrl}`)
	console.log(
		`WebSocket Server is running on ${baseUrl.replace('http', 'ws')}/ws`
	)
})
