const path = require('path')
const { openStreamDeck, listStreamDecks, getStreamDeckInfo } = require('elgato-stream-deck')

const config = require('./config.json');

console.log('Devices: ', listStreamDecks())


let streamDeck1
let streamDeck2

if (typeof config.devices["0"] !== undefined) {
    for (let device in config.devices) {
        let streamDeck // Init Device Object
        let deviceInfo

        if (config.devices[device].deviceID === "") {
            streamDeck = openStreamDeck() // No Device given? No Problem!
            deviceInfo = getStreamDeckInfo()
        } else {
            // Given a specific ID
            streamDeck = openStreamDeck(config.devices[device].deviceID.toString())
            deviceInfo = getStreamDeckInfo(config.devices[device].deviceID.toString())
        }
        // Reset keypad
        streamDeck.clearAllKeys()

        // Set Brightness if set
        if (typeof config.devices[device].brightness !== undefined) {
            streamDeck.setBrightness(config.devices[device].brightness.toString())
        }

        const deviceKeys = config.devices[device].keys

        // Fill keys from config
        for (let key in deviceKeys) {
            let keySetting = deviceKeys[key]

            console.log((typeof keySetting.fillParam).toString())
            if (keySetting.fillType === "color") {
                if ((typeof keySetting.fillParam).toString() === "object" && keySetting.fillParam.length === 3) {
                    streamDeck.fillColor(parseInt(key), keySetting.fillParam[0], keySetting.fillParam[1], keySetting.fillParam[2])
                } else {
                    console.error(`Key ${key} Fill Settings are not as expected, Should be a Array ["R", "G", "B"]`)
                }
            } else if (keySetting.fillType === "image") {
                if ((typeof keySetting.fillParam).toString() === "string") {
                    //streamDeck.fillColor(parseInt(key), keySetting.fillParam[0], keySetting.fillParam[1], keySetting.fillParam[2])
                } else {
                    console.error(`Key ${key} Fill Settings are not as expected, Should be a String "./file/path"`)
                }
            } else {
                console.error(`Unknown Fill Type of : ${keySetting.fillType}`)
            }


        }

        // Press Key
        streamDeck.on('down', keyIndex => {
            if (deviceKeys[keyIndex] !== undefined) {
                console.log(`Key ${keyIndex} is bound like this...`)
                console.log(deviceKeys[keyIndex])

                if (deviceKeys[keyIndex].eventType === "get") {
                    console.log("GET REQUEST")
                } else if (deviceKeys[keyIndex].eventType === "post") {
                    console.log("POST REQUEST")
                } else if (deviceKeys[keyIndex].eventType === "open") {
                    console.log("OPEN REQUEST")
                } else {
                    console.log("UNKNOWN REQUEST TYPE")
                }

            } else {
                console.log(`Key ${keyIndex} is not bound to any key at this time.`)
            }
        })

        // Release Key
        /*streamDeck.on('up', keyIndex => {
            console.log('key %d up', keyIndex)
        })*/

        // Error? What could possibly go wrong?
        streamDeck.on('error', error => {
            console.error(error)
        })
    }
}
