const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const request = require('request').defaults({ encoding: null });
const { openStreamDeck, listStreamDecks, getStreamDeckInfo } = require('elgato-stream-deck');

const config = require('./config.json');

console.log('Devices: ', listStreamDecks());

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
        if (typeof config.devices[device].fillDevice !== undefined) {
            // If set to not fill, then set each key
            if (config.devices[device].fillDevice === "") {
                for (let key in deviceKeys) {
                    let keySetting = deviceKeys[key]
                    if (keySetting.fillType === "color") {
                        if ((typeof keySetting.fillParam).toString() === "object" && keySetting.fillParam.length === 3) {
                            console.log(`Set Color for ${key} to ${keySetting.fillParam[0]},${keySetting.fillParam[1]},${keySetting.fillParam[2]}`)
                            streamDeck.fillColor(parseInt(key), keySetting.fillParam[0], keySetting.fillParam[1], keySetting.fillParam[2])
                        } else {
                            console.error(`Key ${key} Fill Settings are not as expected, Should be a Array ["R", "G", "B"]`)
                        }
                    } else if (keySetting.fillType === "image") {
                        if ((typeof keySetting.fillParam).toString() === "string") {
                            if (fs.existsSync(path.resolve(__dirname, keySetting.fillParam.toString()))) {
                                console.log(`Set Image for ${key} to ${keySetting.fillParam.toString()}`)
                                sharp(path.resolve(__dirname, keySetting.fillParam.toString()))
                                    .flatten() // Eliminate alpha channel, if any.
                                    .resize(streamDeck.ICON_SIZE, streamDeck.ICON_SIZE) // Scale up/down to the right size, cropping if necessary.
                                    .raw() // Give us uncompressed RGB.
                                    .toBuffer()
                                    .then(buffer => {
                                        streamDeck.fillImage(parseInt(key), buffer)
                                    })
                                    .catch(err => {
                                        console.error(`Failed to set image on key ${key} due to a Sharp error! ....`)
                                        console.error(err)
                                    })
                            } else {
                                console.error(`Set Image for ${key} to ${keySetting.fillParam.toString()} failed, Does not Exist!`)
                            }
                        } else {
                            console.error(`Key ${key} Fill Settings are not as expected, Should be a String "./file/path"`)
                        }
                    } else if (deviceKeys[key] === "null") {
                        // Skip Key cause its set to blank
                    } else {
                        console.error(`Unknown Fill Type of : ${keySetting.fillType}`)
                    }
                }
            } else {
                // Fill Entire Panel, but not implimented yet LOL, do it your self loser! (or wait for me to add it)
            }
        }


        // Press Key
        streamDeck.on('down', keyIndex => {
            if (deviceKeys[keyIndex] !== undefined && deviceKeys[keyIndex] !== null) {
                console.log(`Key ${keyIndex} is bound like this...`)
                console.log(deviceKeys[keyIndex])

                if (deviceKeys[keyIndex].eventType === "get") {
                    if ((typeof deviceKeys[keyIndex].eventParam).toString() === "string" && deviceKeys[keyIndex].eventParam !== undefined) {
                        request.get(deviceKeys[keyIndex].eventParam, function (err, res, body) {
                            if(err){
                                console.log(`Failed to GET ${deviceKeys[keyIndex].eventParam} for key ${keyIndex} ...`)
                                console.error(err)
                            } else {
                                console.log(`Sent GET to ${deviceKeys[keyIndex].eventParam} ...`)
                                console.log(body.toString())
                            }
                        })
                    } else {
                        console.log(`Key ${keyIndex} parameters are not correct, should be a string!`)
                    }

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
