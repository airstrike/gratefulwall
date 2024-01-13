import path from "path"
import bodyParser from "body-parser"
import express from "express"
import moment from "moment"
import postgres from "postgres"

import { fileURLToPath } from "url"
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(CURRENT_DIR, "..") // Navigate up one level to get the project root

// PostgreSQL setup
const sql = postgres({
	host: Bun.env.PGHOST,
	port: Number(Bun.env.PGPORT) || 5432,
	database: Bun.env.PGDATABASE,
	username: Bun.env.PGUSER,
	password: Bun.env.PGPASSWORD,
})

// Express setup
const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Serve static files
app.use("/styles", express.static(path.join(PROJECT_ROOT, "static", "styles")))
app.use(
	"/scripts",
	express.static(path.join(PROJECT_ROOT, "static", "scripts")),
)

// Root endpoint to serve HTML file
app.get("/", (req, res) => {
	res.sendFile(path.join(PROJECT_ROOT, "static", "index.html"))
})

// Messages endpoint
app.get("/messages", async (req, res) => {
	try {
		const messages = await fetchMessages()
		res.json(messages)
	} catch (error) {
		console.error("Error fetching messages:", error)
		res.status(500).send("Error processing request")
	}
})

// Submit endpoint
app.post("/submit", async (req, res) => {
	try {
		const { message, initials, location } = req.body
		// remove non ASCII, whitespace, numbers and punctuation
		const cleanMessage = message
			.replace(/[^\w\s]|_/g, "")
			.replace(/\s+/g, " ")
			.replace(/[0-9]/g, "")
			.replace(/;/g, ",")
			.trim()
		const created_at = moment().utc().format("YYYY-MM-DD HH:mm:ss")

		// Basic validation
		console.log(cleanMessage, initials, location, created_at)
		if (!cleanMessage) {
			console.log(
				`${created_at} User posted invalid blank message (empty): ${message}`,
			)
			res.status(400).send("Please enter a message ")
		}
		if (cleanMessage.length > 500) {
			console.log(
				`${created_at} User posted invalid message (too long): ${message}`,
			)
			res.status(400).send("Message is too long (500 chars max)")
		}

		if (initials && initials.length > 50) {
			console.log(
				`${created_at} User posted invalid initials: ${initials}`,
			)
			res.status(400).send("Invalid initials")
		}

		if (location && location.length > 100) {
			console.log(
				`${created_at} User posted invalid location: ${location}`,
			)
			res.status(400).send("Invalid initials")
		}

		// Insert data into the database
		await sql`
        INSERT INTO wall (message, initials, location, created_at) VALUES (${cleanMessage}, ${initials}, ${location}, ${created_at});
      `
		// Invalidate the cache
		messageCache = null

		res.send("Message received")
	} catch (error) {
		console.error("Error handling POST request:", error)
		res.status(500).send("Error processing request")
	}
})

// Start the server
const PORT = Bun.env.PORT || 3000
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})

interface Message {
	id: number
	message: string
	initials: string | null
	location: string | null
	created_at: Date
}

let messageCache: Message[] | null = null

async function fetchMessages(): Promise<Message[]> {
	if (!messageCache) {
		const result = await sql<
			Message[]
		>`SELECT * FROM wall ORDER BY created_at DESC LIMIT 100;`
		messageCache = result
	}
	return messageCache
}

function invalidateMessageQuery() {
	messageCache = null
}

async function handleGetMessages(req: Request) {
	try {
		const messages = await fetchMessages()
		return new Response(JSON.stringify(messages), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		})
	} catch (error) {
		console.error("Error fetching messages:", error)
		return new Response("Error processing request", { status: 500 })
	}
}

async function handlePostRequest(req: Request) {
	try {
		const formData = await req.formData()
		const message = formData.get("message")?.toString().trim()
		const initials = formData.get("initials")?.toString().trim() || null
		const location = formData.get("location")?.toString().trim() || null
		const created_at = moment().utc().format("YYYY-MM-DD HH:mm:ss")

		// Basic validation
		console.log(message, initials, location, created_at)
		if (!message || message.length > 500) {
			// Example length check
			console.error("Invalid message")
			return new Response("Invalid message", { status: 400 })
		}

		if (initials && initials.length > 50) {
			// Example length check
			console.error("Invalid initials")
			return new Response("Invalid initials", { status: 400 })
		}

		if (location && location.length > 100) {
			// Example length check
			console.error("Invalid location")
			return new Response("Invalid location", { status: 400 })
		}

		// Insert data into the database
		await sql`
        INSERT INTO wall (message, initials, location, created_at) VALUES (${message}, ${initials}, ${location}, ${created_at});
      `
		// Invalidate the cache
		messageCache = null

		return new Response("Message received", { status: 200 })
	} catch (error) {
		console.error("Error handling POST request:", error)
		return new Response("Error processing request", { status: 500 })
	}
}
