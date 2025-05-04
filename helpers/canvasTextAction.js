
module.exports = (options) => {

    const Helper = {}

    Helper.setup = () => {
        this.axios = options.axios.getInstance()
        this.token = options.token
        this.configs = options.configs
        this.storageName = 'codenidus.vidus.canvasTextAction'

        return Helper
    }

    Helper.copyText = (url) => {
        return new Promise((resolve, reject) => {
            this.token.getToken((token) => {
                this.axios.get('/api/canvas-text-get?key=' + url, {
                    headers: {
                        'user-token': token
                    }
                }).then(response => {
                    resolve(response.data)
                }).catch((error) => {
                    reject(error)
                })
            })
        })
    }

    Helper.getTextFromBucket = (roomId) => {
        return new Promise((resolve, reject) => {
            this.token.getToken((token) => {
                this.axios.get('/api/canvas-text-list?roomId=' + roomId, {
                    headers: {
                        'user-token': token
                    }
                }).then(response => {
                    let files = response.data.files.map(item => {
                        return {
                            file: item,
                            loading: false,
                        }
                    })

                    resolve(files)
                }).catch(error => {
                    reject(error)
                })
            })
        })
    }

    Helper.getTextFromStorage = () =>  {
        let store = JSON.parse(localStorage.getItem(this.storageName))
        return (!store) ? [] : store.history;
    }

    Helper.storeTextInStorage = (items) =>  {
        localStorage.setItem(this.storageName, JSON.stringify({
            history: items
        }))
    }

    return Helper.setup()
}
