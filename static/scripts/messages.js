// Function to assign random color classes
// function assignRandomColorClass(element) {
// 	const colorClass = `color-${String(
// 		Math.floor(Math.random() * 14) + 1,
// 	).padStart(2, "0")}`
// 	element.classList.add(colorClass)
// }
function assignRandomColorClass() {
	const colorClass = `color-${String(
		Math.floor(Math.random() * 14) + 1,
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
	let i = 0
	for (i = 0; i < len; ++i) {
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

// Usage
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
const messages = document.querySelectorAll("#messages-container .message")
messages.forEach((message, index) => {
	message.style.color = shuffledColors[index % shuffledColors.length]
})

// Function to load messages from the server
async function loadMessages() {
	try {
		const response = await fetch("/messages")
		const messages = await response.json()
		const container = document.getElementById("messages-container")
		container.classList.remove("not-loaded")
		container.classList.add("loaded")

		for (const message of messages) {
			const messageDiv = document.createElement("div")
			messageDiv.className = `message ${assignRandomColorClass()}`
			messageDiv.innerHTML = `
                <p class="content">
                    <span class="message">${message.message}</span>
                    <span class="initials">${message.initials || ""}</span>
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
document.getElementById("form").addEventListener("submit", async function (e) {
	e.preventDefault()

	const formData = new FormData(this)
	const response = await fetch("/submit", {
		method: "POST",
		body: formData,
	})

	const successSpan = document.getElementById("success")
	const errorSpan = document.getElementById("error")

	if (response.ok) {
		document.getElementById("submit").classList.add("hidden")
		successSpan.classList.remove("hidden")

		// Append the new message to the top of the messages-container
		const container = document.getElementById("messages-container")
		const newMessageDiv = document.createElement("div")
		newMessageDiv.className = `message user-message ${assignRandomColorClass()}`
		newMessageDiv.innerHTML = `
            <p class="content">
                <span class="message">${formData.get("message")}</span>
                <span class="initials">${formData.get("initials") || ""}</span>
            </p>
            <p class="location">${formData.get("location") || ""}</p>
        `
		container.prepend(newMessageDiv)
	} else {
		const errorMsg = await response.text()
		errorSpan.textContent = errorMsg
		errorSpan.classList.remove("hidden")
	}
})

// Call loadMessages on page load
loadMessages()
