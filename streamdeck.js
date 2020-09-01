const path = require('path')
const { openStreamDeck, listStreamDecks, getStreamDeckInfo } = require('elgato-stream-deck')

const config = require('./config.json');

console.log('Devices: ', listStreamDecks())


let streamDeck1
let streamDeck2

if (typeof config.devices["0"] !== undefined) {

    for (let devices in config.devices["0"].keys) {
        let streamDeck // Init Device Object
        let deviceInfo

        if (config.devices["0"].deviceID === "") {
            streamDeck = openStreamDeck() // No Device given? No Problem!
            deviceInfo = getStreamDeckInfo()

        } else {
            // Given a specific ID
            streamDeck = openStreamDeck(config.devices["0"].deviceID.toString())
            deviceInfo = getStreamDeckInfo(config.devices["0"].deviceID.toString())
        }
        // Print Device Info
        console.log(deviceInfo)

        // Reset keypad
        streamDeck.clearAllKeys()

        // Set Brightness if set
        if (typeof config.devices["0"].brightness !== undefined) {
            streamDeck.setBrightness(config.devices["0"].brightness.toString())
        }

        // Fill keys from config
        for (let key in config.devices["0"].keys) {
            console.log(config.devices["0"].keys[key])
            streamDeck.fillColor(parseInt(key), config.devices["0"].keys[key].fillParam[0], config.devices["0"].keys[key].fillParam[1], config.devices["0"].keys[key].fillParam[2])
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

    if (typeof config.devices["0"].deviceID !== undefined) {



    }
}
