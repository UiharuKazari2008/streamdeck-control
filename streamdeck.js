const path = require('path')
const { openStreamDeck } = require('elgato-stream-deck')

// Automatically discovers connected Stream Decks, and attaches to the first one.
// Throws if there are no connected stream decks.
// You also have the option of providing the devicePath yourself as the first argument to the constructor.
// For example: const myStreamDeck = new StreamDeck('\\\\?\\hid#vid_05f3&pid_0405&mi_00#7&56cf813&0&0000#{4d1e55b2-f16f-11cf-88cb-001111000030}')
// On linux the equivalent would be: const myStreamDeck = new StreamDeck('0001:0021:00')
// Available devices can be found with listStreamDecks()
const myStreamDeck = openStreamDeck()

myStreamDeck.on('down', keyIndex => {
    console.log('key %d down', keyIndex)
})

myStreamDeck.on('up', keyIndex => {
    console.log('key %d up', keyIndex)
})

// Fired whenever an error is detected by the `node-hid` library.
// Always add a listener for this event! If you don't, errors will be silently dropped.
myStreamDeck.on('error', error => {
    console.error(error)
})

// Fill the first button form the left in the first row with a solid red color. This is synchronous.
myStreamDeck.fillColor(4, 255, 0, 0)
console.log('Successfully wrote a red square to key 4.')
