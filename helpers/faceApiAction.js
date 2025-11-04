/**
 * @typedef {Object} BoundingBox
 * @property {number} xMin - The normalized x-coordinate of the top-left corner (0 to 1).
 * @property {number} yMin - The normalized y-coordinate of the top-left corner (0 to 1).
 * @property {number} width - The normalized width of the bounding box (0 to 1).
 * @property {number} height - The normalized height of the bounding box (0 to 1).
 */

/**
 * @module FaceOverlayHelper
 */
module.exports = (options) => {

    const Helper = {
        imagesItems: [
            { type: 'hat', path: 'https://codenidus.com/videoconference/pirate-hat.webp' },
            { type: 'medal', path: 'https://codenidus.com/videoconference/medal.png' },
        ],
        faceApi: {
            callbacks: {
                hat: null,
                medal: null,
            }
        },
        images: {
            medal: null,
            hat: null,
            faceTest: null,
        }
    };

    Helper.setup = () => {
        Helper.setImages();

        document.addEventListener("onAppReady", (event) => {
            Helper.initialCallbacks();
        });

        return Helper;
    };

    /**
     * Registers face detector callbacks
     */
    Helper.initialCallbacks = () => {
        try {
            Helper.faceApi.callbacks = {
                hat: options.media.registerFaceDetectorCallback('hat', Helper.draw),
                medal: options.media.registerFaceDetectorCallback('medal', Helper.draw)
            }
        } catch(error) {
            if (options.config.debug) {
                console.error('Failed to initialize callbacks:', error);
            }

            throw error;
        }
    };

    /**
     * Loads and prepares images for overlay drawing
     */
    Helper.setImages = () => {
        Helper.imagesItems.forEach(item => {
            Helper.images[item.type] = new Image;
            Helper.images[item.type].crossOrigin = 'anonymous';
            Helper.images[item.type].src = item.path;
            Helper.images[item.type].onerror = () => console.error(`Failed to load ${item.type} image`);
        });
    };

    /**
     * Draws the specified overlay type on the canvas based on face position
     * @param {BoundingBox} lastPosition - The last detected face position data
     * @param {HTMLCanvasElement} canvas - The canvas element to draw on
     * @param {string} type - The type of overlay to draw ('hat' or 'medal')
     */
    Helper.draw = (lastPosition, canvas, type) => {
        try {
            if (!Helper.checkCallbackTimeOut(type)) return;
            if (!Helper.images[type]) return;

            const ctx = canvas.getContext("2d");
            const methodName = 'calculate' + type.charAt(0).toUpperCase() + type.slice(1) + 'Position';

            if (!Helper.calculatePositions[methodName]) {
                console.error(`Position calculation method not found: ${methodName}`);
                return;
            }

            const typePosition = Helper.calculatePositions[methodName](lastPosition);

            ctx.drawImage(Helper.images[type],
              typePosition.posX,
              typePosition.posY,
              typePosition.width,
              typePosition.height);

            ctx.restore();
        } catch(error) {
            if (options.configs.debug) {
                console.error(`Error drawing ${type}:`, error);
            }
        }
    };

    /**
     * Sets a status for the specified overlay type
     * @param {CustomEvent} e - Event containing type and timeout details
     */
    Helper.setStatus = (e) => {
        const { type, status } = e.detail;
        Helper.faceApi.callbacks[type].enable = status;
    };

    /**
     * Checks the callback for a specific type is still within or not
     * @param {string} type - The type of overlay to check
     * @returns {boolean} True if the callback should execute, false otherwise
     */
    Helper.checkCallbackTimeOut = async (type) => {
        if (!Helper.faceApi.callbacks[type].enable) {
            return false;
        }

        return true;
    };


    /**
     * @namespace calculatePositions
     * @description Collection of methods for calculating overlay positions
     */
    Helper.calculatePositions = {
        calculateHatPosition: (data) => {
            const width = data.width * 2.6;
            const aspectRatio = Helper.images.hat.naturalHeight / Helper.images.hat.naturalWidth;

            return {
                width: width,
                height: width * aspectRatio,
                posX: data.xMin - ((width - data.width) / 2),
                posY: data.yMin - ((width - data.width) / 1.22),
            };
        },
        calculateMedalPosition: (data) => {
            const width = data.width / 1.8;
            const aspectRatio = Helper.images.medal.naturalHeight / Helper.images.medal.naturalWidth;

            return {
                width: width,
                height: width * aspectRatio,
                posX: data.xMin + (data.xMin / 1.32),
                posY: data.yMin + data.height + (data.height / 10)
            };
        }
    };

    /**
     * Retrieves custom images from the bucket for a specific room
     * @param {string} roomId - The ID of the room to fetch images for
     * @returns {Promise<boolean>} Resolves to true when operation completes
     */
    Helper.getImagesFromBucket = async (roomId) => {
        try {
            const response = await options.authenticatedRequest('GET', '/api/bucket/images-list?roomId=' + roomId);

            const files = response.files;
            const amazonBucketBaseUrl = `https://${options.configs.aws.bucket_name}.s3.amazonaws.com/`;

            Helper.imagesItems.forEach(item => {
                const itemIndex = Helper.searchInArray(item.type + '.png', files);

                if (itemIndex > -1) {
                    Helper.images[item.type].src = amazonBucketBaseUrl + files[itemIndex];
                }

            });

            return true;
        } catch(error) {
            throw error;
        }
    };

    /**
     * Searches for a specific text pattern in an array of strings
     * @param {string} text - The text to search for
     * @param {string[]} strArray - The array of strings to search in
     * @returns {number} The index of the matching element, or -1 if not found
     */
    Helper.searchInArray = (text, strArray) => {
        if (!strArray || !Array.isArray(strArray)) return -1;

        for (let i=0; i < strArray.length; i++) {
            if (strArray[i].match(text)) return i;
        }

        return -1;
    };

    return Helper.setup()
};
