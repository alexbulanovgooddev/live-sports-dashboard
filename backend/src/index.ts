import { createServer } from 'node:http'
import express from 'express'

const app = express()
const port = Number(process.env.PORT) || 8000
const server = createServer(app)

app.use(express.json())

app.get('/health', (req, res) => {
	res.json({ status: 'ok' })
})

server.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`)
})
