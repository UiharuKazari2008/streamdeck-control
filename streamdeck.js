const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const request = require('request').defaults({ encoding: null });
const { openStreamDeck, listStreamDecks, getStreamDeckInfo } = require('elgato-stream-deck');

const config = require('./config.json');

console.log('Devices: ', listStreamDecks());

if (typeof config.devices !== undefined) {
    for (let device in config.devices) {
        let streamDeck // Init Device Object
        let deviceInfo
        let folderID = ''
        let keyImages = new Map();

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

        function sleep(millis) {
            return new Promise(resolve => setTimeout(resolve, millis));
        }
        function cacheImages(deviceKeys) {
            if (fs.existsSync(path.resolve(__dirname, 'img/back.png'))) {
                console.log(`Set Image for 0 to back button`)
                sharp(path.resolve(__dirname, 'img/back.png'))
                    .flatten() // Eliminate alpha channel, if any.
                    .resize(streamDeck.ICON_SIZE, streamDeck.ICON_SIZE) // Scale up/down to the right size, cropping if necessary.
                    .raw() // Give us uncompressed RGB.
                    .toBuffer()
                    .then(buffer => {
                        keyImages.set(`key-back`, buffer)
                    })
                    .catch(err => {
                        console.error(`Failed to set image on key 0 due to a Sharp error! ....`)
                        console.error(err)
                    })
            } else {
                console.error(`Set Image for 0 to back button failed, Does not Exist!`)
            }
            for (let index in deviceKeys) {
                function generateCacheSet(keySetting, key, folder) {
                    if (keySetting === "null" || keySetting.fillType === "image") {
                        if ((typeof keySetting.fillParam).toString() === "string") {
                            if (fs.existsSync(path.resolve(__dirname, keySetting.fillParam.toString()))) {
                                console.log(`Set Image for ${key} to ${keySetting.fillParam.toString()}`)
                                sharp(path.resolve(__dirname, keySetting.fillParam.toString()))
                                    .flatten() // Eliminate alpha channel, if any.
                                    .resize(streamDeck.ICON_SIZE, streamDeck.ICON_SIZE) // Scale up/down to the right size, cropping if necessary.
                                    .raw() // Give us uncompressed RGB.
                                    .toBuffer()
                                    .then(buffer => {
                                        if (folder !== undefined) {
                                            keyImages.set(`${folder}-${key}`, buffer)
                                        } else {
                                            keyImages.set(`key-${key}`, buffer)
                                        }
                                    })
                                    .catch(err => {
                                        console.error(`Failed to set image cache on key ${key} due to a Sharp error! ....`)
                                        console.error(err)
                                    })
                            } else {
                                console.error(`Failed to cache image for ${key} to ${keySetting.fillParam.toString()} failed, Does not Exist!`)
                            }
                        } else {
                            console.error(`Failed to cache image for ${key} : Fill Settings are not as expected, Should be a String "./file/path"`)
                        }
                    } else {
                        console.error(`Unknown Fill Type of : ${keySetting.fillType}`)
                    }
                }
                if (deviceKeys[index].type === "folder") {
                    for (let folderIndex in deviceKeys[index].items) {
                        generateCacheSet(deviceKeys[index].items[folderIndex], folderIndex, index)
                    }
                } else {
                    generateCacheSet(deviceKeys[index], index)
                }

            }
        }
        cacheImages(config.devices[device].keys)
        function drawKeys(deviceKeys, arrayType) {
            streamDeck.clearAllKeys()
            if (arrayType === 'folder') {
                streamDeck.fillImage(0, keyImages.get('key-back'))
            }
            for (let key in deviceKeys) {
                let keySetting
                if (arrayType === 'folder') {
                    keySetting = deviceKeys[key]
                    key = parseInt(key) + 1
                } else {
                    keySetting = deviceKeys[key]
                }
                if (keySetting.fillType === "color") {
                    if ((typeof keySetting.fillParam).toString() === "object" && keySetting.fillParam.length === 3) {
                        console.log(`Set Color for ${key} to ${keySetting.fillParam[0]},${keySetting.fillParam[1]},${keySetting.fillParam[2]}`)
                        streamDeck.fillColor(parseInt(key), keySetting.fillParam[0], keySetting.fillParam[1], keySetting.fillParam[2])
                    } else {
                        console.error(`Key ${key} Fill Settings are not as expected, Should be a Array ["R", "G", "B"]`)
                    }
                } else if (keySetting.fillType === "image") {
                    if (arrayType === 'folder') {
                        streamDeck.fillImage(parseInt(key), keyImages.get(`${folderID}-${key}`))
                    } else {
                        streamDeck.fillImage(parseInt(key), keyImages.get(`key-${key}`))
                    }
                } else if (deviceKeys[key] === "null") {
                    // Skip Key cause its set to blank
                } else {
                    console.error(`Unknown Fill Type of : ${keySetting.fillType}`)
                }
            }
        }



        // Fill keys from config
        async function main() {
            console.log("Waiting to draw keys");
            await sleep(2000);
            if (typeof config.devices[device].fillDevice !== undefined) {
                // If set to not fill, then set each key
                if (config.devices[device].fillDevice === "") {
                    drawKeys(config.devices[device].keys, 'init')
                } else {
                    // Fill Entire Panel, but not implimented yet LOL, do it your self loser! (or wait for me to add it)
                }
            }
        }

        main();


        // Press Key
        streamDeck.on('down', keyIndex => {
            if (config.devices[device].keys[keyIndex] !== undefined && config.devices[device].keys[keyIndex] !== null) {
                console.log(`Key ${keyIndex} is bound like this...`)

                function doKeyAction(deviceKeys) {
                    let keyRealIndex = keyIndex;
                    if (folderID !== '') {
                        keyRealIndex = parseInt(keyIndex.toString()) - 1
                    }
                    console.log(keyRealIndex)
                    console.log(deviceKeys[keyRealIndex])
                    if (deviceKeys[keyRealIndex].type === "action") {
                        if (deviceKeys[keyRealIndex].eventType === "get") {
                            if ((typeof deviceKeys[keyRealIndex].eventParam).toString() === "string" && deviceKeys[keyRealIndex].eventParam !== undefined) {
                                request.get(deviceKeys[keyRealIndex].eventParam, function (err, res, body) {
                                    if(err){
                                        console.log(`Failed to GET ${deviceKeys[keyRealIndex].eventParam} for key ${keyRealIndex} ...`)
                                        console.error(err)
                                    } else {
                                        console.log(`Sent GET to ${deviceKeys[keyRealIndex].eventParam} ...`)
                                        console.log(body.toString())
                                    }
                                })
                            } else {
                                console.log(`Key ${keyRealIndex} parameters are not correct, should be a string!`)
                            }
                        } else if (deviceKeys[keyRealIndex].eventType === "post") {
                            console.log("POST REQUEST")
                        } else if (deviceKeys[keyRealIndex].eventType === "open") {
                            console.log("OPEN REQUEST")
                        } else {
                            console.log("UNKNOWN REQUEST TYPE")
                        }
                    } else if (deviceKeys[keyRealIndex].type === "folder") {
                        if (deviceKeys[keyRealIndex].items !== undefined && deviceKeys[keyRealIndex].items.length > 0) {
                            folderID = keyRealIndex;
                            drawKeys(deviceKeys[keyRealIndex].items, 'folder');
                        } else {
                            console.log(`Folder on Key ${keyRealIndex} is not correctly configured or has no items in it`)
                        }
                    }
                }

                if (folderID === "") {
                    doKeyAction(config.devices[device].keys)
                } else {
                    if (keyIndex === 0) {
                        folderID = ''
                        drawKeys(config.devices[device].keys, 'init')
                    } else {
                        if (config.devices[device].keys[folderID].items !== undefined && config.devices[device].keys[folderID].items.length > 0) {
                            doKeyAction(config.devices[device].keys[folderID].items)
                        } else {
                            console.log(`Folder on Key ${keyIndex} is not correctly configured`)
                        }
                    }
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
