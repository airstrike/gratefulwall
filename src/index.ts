import path from "path"
import bodyParser from "body-parser"
import express from "express"
import moment from "moment"
// import pg from "pg"
import postgres from "postgres" // Replace 'PostgresClient' with the actual type from your library
import validator from "validator"

// Connect to the database using the DATABASE_URL environment
//   variable injected by Railway
// const pool = new pg.Pool()

import { fileURLToPath } from "url"
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(CURRENT_DIR, "..") // Navigate up one level to get the project root

let sql: ReturnType<typeof postgres>
let sqlError = false
if (Bun.env.DATABASE_PRIVATE_URL) {
	console.log(
		`Trying to connect via private URL: ${Bun.env.DATABASE_PRIVATE_URL}`,
	)
	try {
		sql = postgres(Bun.env.DATABASE_PRIVATE_URL)
		console.log("Connected to database via private URL")
	} catch (error) {
		sqlError = true
		console.log("Error connecting to via private URL")
		console.error(error)
		console.log("Trying to connect to via other env vars")
	}
}
if (!Bun.env.DATABASE_PRIVATE_URL || sqlError) {
	console.log({
		host: Bun.env.PGHOST,
		port: Number(Bun.env.PGPORT) || 5432,
		database: Bun.env.PGDATABASE,
		username: Bun.env.PGUSER,
	})
	try {
		sql = postgres({
			host: Bun.env.PGHOST,
			port: Number(Bun.env.PGPORT) || 5432,
			database: Bun.env.PGDATABASE,
			username: Bun.env.PGUSER,
			password: Bun.env.PGPASSWORD,
		})
		console.log("Connected to database with env vars")
	} catch (error) {
		console.error("Error connecting to database with env vars")
	}
}

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
		const cleanMessage = validator.escape(message)

		const created_at = moment().utc().format("YYYY-MM-DD HH:mm:ss")

		// Basic validation
		// console.log(cleanMessage, initials, location, created_at)
		console.log(`${created_at} "${message}" —${initials} @ ${location}`)
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
		// await pool.query(
		// 	"INSERT INTO wall (message, initials, location, created_at) VALUES ($1, $2, $3, $4);",
		// 	[message, initials, location, created_at],
		// )
		invalidateMessageQuery()

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

// let messageCache: Message[] | null = null
interface MessageCache {
	messages: Message[] | null
	lastUpdated: Date | null
}

let messageCache: MessageCache = {
	messages: null,
	lastUpdated: null,
}

async function fetchMessages(): Promise<Message[]> {
	// Check if cache is older than 5 minutes
	if (
		!messageCache.messages ||
		!messageCache.lastUpdated ||
		new Date().getTime() - messageCache.lastUpdated.getTime() >
			5 * 60 * 1000
	) {
		// Fetch from database and update cache
		const result = await sql<
			Message[]
			// >`SELECT * FROM wall ORDER BY created_at DESC LIMIT 100;`
		>`SELECT * FROM wall ORDER BY RANDOM() LIMIT 100;`
		messageCache.messages = result
		messageCache.lastUpdated = new Date()
	}
	return messageCache.messages
}

function invalidateMessageQuery() {
	// Invalidate cache
	messageCache = {
		messages: null,
		lastUpdated: new Date(), // Optionally update the timestamp to the current time
	}
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
		// Insert using pool
		// await pool.query(
		// 	"INSERT INTO wall (message, initials, location, created_at) VALUES ($1, $2, $3, $4);",
		// 	[message, initials, location, created_at],
		// )

		// Invalidate the cache
		invalidateMessageQuery()

		return new Response("Message received", { status: 200 })
	} catch (error) {
		console.error("Error handling POST request:", error)
		return new Response("Error processing request", { status: 500 })
	}
}
