
module.exports = (options) => {

    const Helper = {}

    Helper.setup = () => {
        this.axios = options.axios.getInstance()
        this.token = options.token
        this.configs = options.configs
        this.media = options.media

        this.faceApi = {
            drawItems: ['hat', 'medal'],
            endTime: {
                hat: null,
                medal: null,
            },
            callbacks: {
                hat: null,
                medal: null,
            }
        }

        this.images = {
            medal: null,
            hat: null,
            faceTest: null,
        }

        Helper.setImages()

        document.addEventListener("codenidus-vidus-setup", (event) => {
            Helper.initialCallbacks()
        });

        return Helper
    }

    Helper.initialCallbacks = () => {
        this.faceApi.callbacks.hat = this.media.registerFaceDetectorCallback('hat', Helper.draw);
        this.faceApi.callbacks.medal = this.media.registerFaceDetectorCallback('medal', Helper.draw);
    }

    Helper.setImages = () => {
        this.images.hat = new Image
        this.images.hat.crossOrigin = 'anonymous'
        this.images.hat.src = 'https://codenidus.com/videoconference/pirate-hat.webp'

        this.images.medal = new Image
        this.images.medal.crossOrigin = 'anonymous'
        this.images.medal.src = 'https://codenidus.com/videoconference/medal.png'
    }

    Helper.draw = (lastPosition, canvas, type) => {
        if (!Helper.checkCallbackTimeOut(type)) return

        const ctx = canvas.getContext("2d")
        const methodName = 'calculate' + type.charAt(0).toUpperCase() + type.slice(1) + 'Position'
        const typePosition = Helper.calculatePositions[methodName](lastPosition)

        ctx.drawImage(this.images[type],
            typePosition.posX,
            typePosition.posY,
            typePosition.width,
            typePosition.height)
    }

    Helper.setTimer = (e) => {
        this.faceApi.endTime[e.detail.type] = new Date()
        this.faceApi.endTime[e.detail.type].setTime(
            this.faceApi.endTime[e.detail.type].getTime() + parseInt(e.detail.timeout) * 1000
        )

        this.faceApi.callbacks[e.detail.type].enable = true
    }


    Helper.checkCallbackTimeOut = async (type) => {
        let currentTime = Date.now()

        if (!this.faceApi.callbacks[type].enable) {
            return false
        }

        if (currentTime > this.faceApi.endTime[type]) {
            this.faceApi.endTime[type] = null
            this.faceApi.callbacks[type].enable = false
            return false
        }

        return true
    }


    Helper.calculatePositions = {
        calculateHatPosition: (data) => {
            let width = data.width * 2.6;

            return {
                width: width,
                height: this.images.hat.naturalHeight / (this.images.hat.naturalWidth / width),
                posX: data.xMin - ((width - data.width) / 2),
                posY: data.yMin - ((width - data.width) / 1.22),
            };
        },
        calculateMedalPosition: (data) => {
            let width = data.width / 1.8;

            return {
                width: width,
                height: this.images.medal.naturalHeight / (this.images.medal.naturalWidth / width),
                posX: data.xMin + (data.xMin / 1.32),
                posY: data.yMin + data.height + (data.height / 10)
            };
        }
    }

    Helper.getImagesFromBucket = (roomId) => {
        return new Promise((resolve, reject) => {
            this.token.getToken((token) => {
                this.axios.get('/api/bucket/images-list?roomId=' + roomId, {
                    headers: {
                        'user-token': token
                    }
                }).then(response => {
                    let files = response.data.files

                    let hatIndex = Helper.searchInArray('hat.png', files)
                    if (hatIndex > -1) {
                        this.images.hat.src = 'https://' + this.configs.aws.bucket_name + '.s3.amazonaws.com/' + files[hatIndex]
                    }
                }).finally(() => {
                    resolve(true)
                })
            })
        }).catch(error => {
            return error
        })
    }

    Helper.searchInArray = (text, strArray) => {
        for (var j=0; j<strArray.length; j++) {
            if (strArray[j].match(text)) return j;
        }
        return -1;
    }

    return Helper.setup()
}
