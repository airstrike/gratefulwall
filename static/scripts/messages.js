function assignRandomColorClass() {
	const colorClass = `color-${String(
		Math.floor(Math.random() * 21) + 1,
	).padStart(2, "0")}`
	return colorClass
}

function byte2Hex(n) {
	const nybHexString = "0123456789ABCDEF"
	return (
		String(nybHexString.substr((n >> 4) & 0x0f, 1)) +
		nybHexString.substr(n & 0x0f, 1)
	)
}

function RGB2Color(r, g, b) {
	return `#${byte2Hex(r)}{byte2Hex(g)}{byte2Hex(b)}`
}

function makeColorGradient(
	frequency1,
	frequency2,
	frequency3,
	phase1,
	phase2,
	phase3,
	center,
	width,
	len,
) {
	const colors = []
	for (let i = 0; i < len; ++i) {
		const red = Math.sin(frequency1 * i + phase1) * width + center
		const grn = Math.sin(frequency2 * i + phase2) * width + center
		const blu = Math.sin(frequency3 * i + phase3) * width + center
		colors.push(RGB2Color(red, grn, blu))
	}
	return colors
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

// Generate and shuffle colors
const colorFrequency = 2.4
const gradientColors = makeColorGradient(
	colorFrequency,
	colorFrequency,
	colorFrequency,
	0,
	2,
	4,
	128,
	127,
	14,
)
const shuffledColors = shuffleArray(gradientColors)
// Assign colors to messages

// Function to load messages from the server
async function loadMessages() {
	try {
		const response = await fetch("/messages")
		let messages = await response.json()
		const container = document.getElementById("messages-container")
		container.classList.remove("not-loaded")
		container.classList.add("loaded")

		// Shuffle the messages array
		messages = shuffleArray(messages)

		for (const message of messages) {
			if (!message.message) continue
			const messageDiv = document.createElement("div")
			messageDiv.className = `message ${assignRandomColorClass()}`
			messageDiv.innerHTML = `
                <p class="content">
                    <span class="message">"${message.message}"</span>
                    <span class="initials">${message.initials || "Anonymous"}</span>
                </p>
                <p class="location">${message.location || ""}</p>
            `
			container.appendChild(messageDiv)
		}
	} catch (error) {
		console.error("Failed to load messages:", error)
	}
}
// Function to handle form submission
try {
	document
		.getElementById("gratitude-form")
		.addEventListener("submit", async function (e) {
			e.preventDefault()

			const formData = new FormData(this)
			const formDataObj = Object.fromEntries(formData.entries())
			const formDataStr = new URLSearchParams(formDataObj).toString()

			const response = await fetch("/submit", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: formDataStr,
			})

			const formElement = document.getElementById("gratitude-form")
			const successSpan = document.getElementById("success")
			const errorSpan = document.getElementById("error")

			console.log(response)

			if (response.ok) {
				formElement.classList.add("hidden") // Hide form immediately
				successSpan.classList.remove("hidden") // Show success message

				// Add the 'submitted' class to start the animation
				const gratitudeFormWrapper = document.getElementById(
					"gratitude-form-wrapper",
				)
				const gratitudeForm = document.getElementById("gratitude-form")
				gratitudeForm.classList.add("submitted")
				document
					.getElementById("fixed-header")
					.classList.add("submitted")

				// Append the new message to the top of the messages-container
				const container = document.getElementById("messages-container")
				const newMessageDiv = document.createElement("div")
				newMessageDiv.className = `message user-message ${assignRandomColorClass()}`
				newMessageDiv.innerHTML = `
            <p class="content">
                <span class="message">"${formData.get("message")}"</span>
                <span class="initials">${
					formData.get("initials") || "Anonymous"
				}</span>
            </p>
            ${
				formData.get("location")
					? `<p class="location">${formData.get("location")}</p>`
					: ""
			}
        `
				// Clear the form so it's not filled the same way on reload
				formElement.reset()

				container.prepend(newMessageDiv)
			} else {
				const errorMsg = await response.text()
				errorSpan.textContent = errorMsg
				errorSpan.classList.remove("hidden")
			}
		})
} catch {}

// No longer call loadMessages on page load
// loadMessages()

const messages = document.querySelectorAll("#messages-container .message")
messages.forEach((message, index) => {
	message.style.color = shuffledColors[index % shuffledColors.length]
})

try {
	document.getElementById("close-button").addEventListener("click", () => {
		document.getElementById("gratitude-form-wrapper").style.display = "none"
		document.getElementById("fixed-header").classList.add("submitted")
	})
} catch {}

function b(s) {
	const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
	const pad = "="
	const len = s.length
	const apad = a + pad
	let bits = 0
	let o = ""
	let x
	let v
	let c

	for (let i = 0; i < len; i += 1) {
		v = apad.indexOf(s.charAt(i))
		if (v >= 0 && v < 32) {
			x = (x << 5) | v
			bits += 5
			if (bits >= 8) {
				c = (x >> (bits - 8)) & 0xff
				o = o + String.fromCharCode(c)
				bits -= 8
			}
		}
	}

	// Remaining bits are < 8
	if (bits > 0) {
		c = ((x << (8 - bits)) & 0xff) >> (8 - bits)
		// Don't append a null terminator.
		if (c !== 0) {
			o = o + String.fromCharCode(c)
		}
	}
	return o
}

async function replaceContact() {
	const contact = document.querySelector(".contact")
	const me = "M5ZGC5DJOR2WIZKAMFXGI6LUMVZHEYJOMNXW2==="
	const me_base32_decoded = contact.addEventListener("mouseover", () => {
		// replace the word 'Contact' with an email address, but only if it doesn't already have a class `link`
		if (contact.classList.contains("link")) {
			return
		}
		// add the class `link` to the contact element
		contact.classList.add("link")
		const h = contact.innerHTML
		contact.innerHTML = `<a href="mailto: ${b(me)}">${h}</a>`
	})
}

replaceContact()
