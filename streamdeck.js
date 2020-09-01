const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const colors = require('colors');
const request = require('request').defaults({ encoding: null });
const { openStreamDeck, listStreamDecks, getStreamDeckInfo } = require('elgato-stream-deck');

const config = require('./config.json');

console.log('Devices:\n', listStreamDecks());

if (typeof config.devices !== undefined) {
    for (let device in config.devices) {
        let streamDeck // Init Device Object
        let deviceInfo
        let folderID = ''
        let keyImages = new Map();

        // Initialize device object
        if (config.devices[device].deviceID === "") {
            streamDeck = openStreamDeck(listStreamDecks()[0].path) // No Device given? No Problem!
            deviceInfo = getStreamDeckInfo(listStreamDecks()[0].path)
            streamDeck.clearAllKeys()
        } else {
            // Given a specific ID
            streamDeck = openStreamDeck(config.devices[device].deviceID.toString())
            deviceInfo = getStreamDeckInfo(config.devices[device].deviceID.toString())
            streamDeck.clearAllKeys()
        }
        // Set Brightness if set
        if (typeof config.devices[device].brightness !== undefined) {
            streamDeck.setBrightness(parseInt(config.devices[device].brightness))
        }

        function sleep(millis) {
            return new Promise(resolve => setTimeout(resolve, millis));
        }
        // Cache Images for Keys and Folders
        function cacheImages() {
            console.log("Generating Images for Cache".bgBlack.white);
            // Generate Default Images
            if (fs.existsSync(path.resolve(__dirname, 'img/back.png'))) {
                sharp(path.resolve(__dirname, 'img/back.png'))
                    .flatten() // Eliminate alpha channel, if any.
                    .resize(streamDeck.ICON_SIZE, streamDeck.ICON_SIZE) // Scale up/down to the right size, cropping if necessary.
                    .raw() // Give us uncompressed RGB.
                    .toBuffer()
                    .then(buffer => {
                        console.log("Caching Back Button");
                        keyImages.set(`default-back`, buffer);
                    })
                    .catch(err => {
                        console.error(`Failed to cache for Back due to a Sharp error! ....`);
                        console.error(err);
                    })
            } else {
                console.error(`Failed to cache image for back icon, Does not Exist!`);
            }

            // Generate Per-Key Images
            const deviceKeys = config.devices[device].keys;
            for (let index in deviceKeys) {
                function generateCacheSet(keySetting, key, folder) {
                    let keyIndexString
                    if (folder !== undefined) {
                        keyIndexString = `${folder}:${key}`
                    } else {
                        keyIndexString = `${key}`
                    }
                    if (keySetting.fillType === "image") {
                        if ((typeof keySetting.fillParam).toString() === "string") {
                            if (fs.existsSync(path.resolve(__dirname, keySetting.fillParam.toString()))) {
                                sharp(path.resolve(__dirname, keySetting.fillParam.toString()))
                                    .flatten() // Eliminate alpha channel, if any.
                                    .resize(streamDeck.ICON_SIZE, streamDeck.ICON_SIZE) // Scale up/down to the right size, cropping if necessary.
                                    .raw() // Give us uncompressed RGB.
                                    .toBuffer()
                                    .then(buffer => {
                                        keyImages.set(keyIndexString, buffer) // Save Buffer to Map
                                        console.log(keyIndexString);
                                    })
                                    .catch(err => {
                                        console.error(`Failed to cache for key #${keyIndexString} due to a Sharp error! ....`);
                                        console.error(err);
                                    })
                            } else {
                                console.error(`Failed to cache for key #${keyIndexString} to file "${keySetting.fillParam.toString()}", File does not exist!`);
                            }
                        } else {
                            console.error(`Failed to cache image for key #${keyIndexString}, Fill Settings are not as expected (Should be a String "./file/path")`);
                        }
                    }
                }

                if (deviceKeys[index].type === "action") { // if is standard action button
                    generateCacheSet(deviceKeys[index], index);
                } else if (deviceKeys[index].type === "folder") { // if is a folder of items
                    for (let folderIndex in deviceKeys[index].items) {
                        generateCacheSet(deviceKeys[index].items[folderIndex], folderIndex, index);
                    }
                }
            }
        }
        cacheImages();

        function drawKeys(deviceKeys, folderIndex) {
            streamDeck.clearAllKeys() // Erase Current Keys off screen
            if (folderIndex !== undefined) { // If inside folder, set first item to back icon
                streamDeck.fillImage(0, keyImages.get('default-back'))
            }
            for (let index in deviceKeys) {
                let keySetting
                let keyIndex
                let keyIndexString

                if (folderIndex !== undefined) {
                    keySetting = deviceKeys[index]
                    keyIndex = parseInt(index) + 1
                    keyIndexString = `${folderIndex}:${index}`
                } else {
                    keySetting = deviceKeys[index]
                    keyIndex = parseInt(index)
                    keyIndexString = `${index}`
                }

                if (keySetting.fillType === "color") {
                    if ((typeof keySetting.fillParam).toString() === "object" && keySetting.fillParam.length === 3) {
                        console.log(`Set Color for key #${keyIndexString} to ${keySetting.fillParam[0]},${keySetting.fillParam[1]},${keySetting.fillParam[2]}`)
                        streamDeck.fillColor(parseInt(keyIndex), keySetting.fillParam[0], keySetting.fillParam[1], keySetting.fillParam[2])
                    } else {
                        console.error(`Failed to fill Key #${keyIndexString}, Fill Settings are not as expected (Should be a Array ["R", "G", "B"])`)
                    }
                } else if (keySetting.fillType === "image") {
                    streamDeck.fillImage(parseInt(keyIndex), keyImages.get(keyIndexString))
                } else if (deviceKeys[keyIndex] === "null") {
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
                // Fill entire device scree
            } else {
                // Draw Each Key
                drawKeys(config.devices[device].keys)
            }
        }

        main();


        // Press Key
        streamDeck.on('down', keyIndex => {
            if (config.devices[device].keys[keyIndex] !== undefined && config.devices[device].keys[keyIndex] !== null) {
                function doKeyAction(deviceKeys) {
                    let keyRealIndex

                    if (folderID !== '') {
                        keyRealIndex = parseInt(keyIndex.toString()) - 1
                    } else {
                        keyRealIndex = parseInt(keyIndex.toString())
                    }

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
                            folderID = keyIndex;
                            drawKeys(deviceKeys[keyRealIndex].items, folderID);
                        } else {
                            console.log(`Folder on Key #${keyRealIndex} is not correctly configured or has no items in it`)
                        }
                    }
                }

                if (folderID === "") {
                    doKeyAction(config.devices[device].keys);
                } else {
                    if (keyIndex === 0) {
                        folderID = '';
                        drawKeys(config.devices[device].keys);
                    } else {
                        if (config.devices[device].keys[folderID].items !== undefined && config.devices[device].keys[folderID].items.length > 0) {
                            doKeyAction(config.devices[device].keys[folderID].items);
                        } else {
                            console.log(`Folder #${folderID} with key #${keyIndex} is not correctly configured`);
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
