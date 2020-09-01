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
        // Print Device Info
        console.log(deviceInfo)

        // Reset keypad
        streamDeck.clearAllKeys()

        // Set Brightness if set
        if (typeof config.devices[device].brightness !== undefined) {
            streamDeck.setBrightness(config.devices[device].brightness.toString())
        }

        // Fill keys from config
        for (let key in config.devices[device].keys) {
            console.log(config.devices[device].keys[key])
            streamDeck.fillColor(parseInt(key), config.devices[device].keys[key].fillParam[0], config.devices[device].keys[key].fillParam[1], config.devices[device].keys[key].fillParam[2])
        }

        // Press Key
        streamDeck.on('down', keyIndex => {
            console.log('key %d down', keyIndex)
        })
        // Release Key
        streamDeck.on('up', keyIndex => {
            console.log('key %d up', keyIndex)
        })
        // Error? What could possibly go wrong?
        streamDeck.on('error', error => {
            console.error(error)
        })
    }
}
