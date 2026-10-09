import { createServer } from 'node:http'
import express, { type ErrorRequestHandler } from 'express'
import { matchesRouter } from './routes/matches.ts'

const app = express()
const port = Number(process.env.PORT) || 8000
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

server.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`)
})
