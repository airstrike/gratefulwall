import postgres from "postgres"

// const sql = postgres("postgres://username:password@host:port/database", {
const sql = postgres({
	host: Bun.env.PGHOST, // Postgres ip address[s] or domain name[s]
	port: Number(Bun.env.PGPORT) || 5432, // Postgres server port[s]
	database: Bun.env.PGDATABASE, // Name of database to connect to
	username: Bun.env.PGUSER, // Username of database user
	password: Bun.env.PGPASSWORD, // Password of database user
})

// TABLE def:
// CREATE TABLE wall (id SERIAL PRIMARY KEY, message TEXT NOT NULL, initials VARCHAR, locations VARCHAR, created_at TIMESTAMP);

import { serve } from "bun"

serve({
	fetch(req: Request) {
		const { pathname } = new URL(req.url)

		// Serve the HTML file on root access
		if (pathname === "/") {
			return new Response(Bun.file("./static/index.html"), {
				headers: {
					"Content-Type": "text/html",
				},
			})
		}

		// Serve files from the /static/ directory
		if (
			pathname.startsWith("/styles/") ||
			pathname.startsWith("/scripts/")
		) {
			try {
				return new Response(Bun.file(`./static${pathname}`), {
					headers: {
						"Content-Type": "text/css",
					},
				})
			} catch (error) {
				return new Response("File not found", { status: 404 })
			}
		}

		// Fetch messages
		if (pathname === "/messages" && req.method === "GET") {
			return handleGetMessages(req)
		}

		// Handle POST request
		if (pathname === "/submit" && req.method === "POST") {
			return handlePostRequest(req)
		}

		// 404 for any other endpoints
		return new Response("Not Found", { status: 404 })
	},
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

		// Basic validation
		if (!message || message.length > 500) {
			// Example length check
			return new Response("Invalid message", { status: 400 })
		}

		if (initials && initials.length > 50) {
			// Example length check
			return new Response("Invalid initials", { status: 400 })
		}

		if (location && location.length > 100) {
			// Example length check
			return new Response("Invalid location", { status: 400 })
		}

		// Insert data into the database
		await sql`
        INSERT INTO wall (message, initials, location) VALUES (${message}, ${initials}, ${location});
      `
		// Invalidate the cache
		messageCache = null

		return new Response("Message received", { status: 200 })
	} catch (error) {
		console.error("Error handling POST request:", error)
		return new Response("Error processing request", { status: 500 })
	}
}
