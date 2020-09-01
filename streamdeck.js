const path = require('path')
const { openStreamDeck, listStreamDecks } = require('elgato-stream-deck')

const config = require('../config.json');

console.log('Devices: ', listStreamDecks())

let streamDeck0
let streamDeck1
let streamDeck2

if (typeof config.devices["0"] !== undefined) {
    if (typeof config.devices["0"].deviceID !== undefined) {
        if (config.devices["0"].deviceID === "") {
            streamDeck0 = openStreamDeck()
        } else {
            streamDeck0 = openStreamDeck(config.devices["0"].deviceID.toString(), {
                useOriginalKeyOrder: true
            })
        }

        if (typeof config.devices["0"].brightness !== undefined) {
            streamDeck0.setBrightness(config.devices["0"].brightness.toString())
        }

        for (let key in config.devices["0"].keys) {
            streamDeck0.fillColor(config.devices["0"].keys[key].toString(), config.devices["0"].keys[key].fillParam[0], config.devices["0"].keys[key].fillParam[1], config.devices["0"].keys[key].fillParam[2])
        }

        streamDeck0.on('down', keyIndex => {
            console.log('key %d down', keyIndex)
        })

        streamDeck0.on('up', keyIndex => {
            console.log('key %d up', keyIndex)
        })

        streamDeck0.on('error', error => {
            console.error(error)
        })


    }
}





// Fired whenever an error is detected by the `node-hid` library.
// Always add a listener for this event! If you don't, errors will be silently dropped.

// Fill the first button form the left in the first row with a solid red color. This is synchronous.
myStreamDeck.fillColor(4, 255, 0, 0)
console.log('Successfully wrote a red square to key 4.')
