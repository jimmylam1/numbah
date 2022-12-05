const Discord = require('discord.js');
const { fork } = require("child_process")
require('dotenv').config();

const RELAUNCH = process.env.BETA ? false : true
const files = [
	["numbah.js", 80]
]
const logWebhookClient = new Discord.WebhookClient({
    url: "https://discord.com/api/webhooks/1049172140626300948/QGmC68tx9sW7wAcpFK7dkcJ7-47lDbDYrvCk22p6AlCmBcfJ_9I2hdIlqiD-JnRJ0tVE"
})

let sendLogs = process.env.BETA ? false : true

if (files.length != 1) {
	console.log(`‼️ index.js may not be running all processes. Check before deploying!`)
}

for (const [fname, color] of files) {
	if (fname)
		runProcess(fname, color)
}

let failedLogs = []

function runProcess(fname, color=255) {
	console.log(`⑂ Forking ${fname}`)
	try {
        const child = fork(fname, [], { silent: true })

        // child.send(data)

        child.on("message", obj => {
            
        })
        child.on("error", e => {
            console.log(`> Child process ${fname} had error: ${e}`, e)
        })
        child.on("close", code => {
            console.log(`> Child process ${fname} closed`)
            if (RELAUNCH)
            	runProcess(fname, color)
        })
        child.stdout.on("data", data => {
            let now = new Date()
        	console.log(`\u001b[38;5;${color}m${now.toISOString()}\u001b[0m`, data.toString().trim())

            if (data.toString().includes("Logged in as") && data.toString().includes("Beta"))
                sendLogs = false

            if (sendLogs) {
                logWebhookClient.send(`[<t:${Math.round(Date.now() / 1000)}:D> <t:${Math.round(Date.now() / 1000)}:T>] ${data.toString()}`)
                .catch(e => {
                    console.log(`logWebhookClient error: ${e}`)
                    // failedLogs.push(`[<t:${Math.round(Date.now() / 1000)}:D> <t:${Math.round(Date.now() / 1000)}:T>] ${data.toString()}`)
                    // sendLogs()
                })
            }
        })
        child.stderr.on("data", data => {
            let now = new Date()
        	console.log(`\u001b[38;5;${color}m${now.toISOString()}\u001b[0m`, data.toString().trim())
            if (sendLogs) {
                logWebhookClient.send(`[<t:${Math.round(Date.now() / 1000)}:D> <t:${Math.round(Date.now() / 1000)}:T>] ${data.toString()}`)
                .catch(e => {
                    console.log(`logWebhookClient error: ${e}`)
                    // failedLogs.push(`[<t:${Math.round(Date.now() / 1000)}:D> <t:${Math.round(Date.now() / 1000)}:T>] ${data.toString()}`)
                    // sendLogs()
                })
            }
        })
    }
    catch(e) {
        console.log(`> Failed to create child process for ${fname}: ${e}`)
    }
}

// sendLogs() {
//     setTimeout(() => {
//         let combined = failedLogs.join("\n")


//     }, 10*60*1000)
// }

