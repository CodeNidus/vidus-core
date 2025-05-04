
module.exports = (options) => {

    const Helper = {}

    Helper.setup = () => {
        this.axios = options.axios
        this.configs = options.configs
        this.overrides = options.overrides
        this.storageName = 'codenidus.vidus.user.token'

        this.webrtcToken = {
            username: null,
            token: null,
            roomId: null,
            expired: null,
        }

        const data = JSON.parse(localStorage.getItem(this.storageName))

        if (!!data) {
            this.webrtcToken = data
        }

        return Helper
    }

    Helper.getToken = async (next, error = (e) => console.log(e)) => {
        try {
            if (!this.webrtcToken || !this.webrtcToken.token || this.webrtcToken.expired < Date.now()) {
                await Helper.reGenerateToken()
            }

            next(this.webrtcToken.token)
        } catch (e) {
            error(e)
        }
    }

    Helper.forceGenerateToken = async (next, error = (e) => console.log(e)) => {
        try {
            await Helper.reGenerateToken()
            next(this.webrtcToken.token);
        } catch (e) {
            error(e)
        }
    }

    Helper.reGenerateToken = () => {
        return new Promise(async (resolve, reject) => {
            const apiClient = this.axios.getInstance(this.configs.authorization.url)
            const token = localStorage.getItem(this.configs.authorization.token) || '';

            if(token === '') {
                console.log('It seems that your authorization token is not stored in local storage.')
            }

            // check if axios not override then run next line else run override method
            const requestOverride = this.overrides.value?.helper?.userToken?.request || null

            try {
                if (requestOverride) {
                    const response = await requestOverride(apiClient, this.configs, token)
                    await Helper.setToken(response)
                    resolve(true)
                } else {
                    apiClient({
                        method: 'get',
                        url: this.configs.api_token_url,
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }).then(async response => {
                        await Helper.setToken(response.data.data)
                        resolve(true)
                    }, error => {
                        if(error.code === 12) {
                            reject('Please ensure your url configs for video conference package.')
                        }
                        reject('Error happened! ' + error.response.data.message)
                    })
                }
            } catch (e) {
                reject(e)
            }
        });
    }

    Helper.removeToken = () => {
        this.webrtcToken = null
        localStorage.removeItem(this.storageName)
    }

    Helper.setToken = (tokenData) => {
        return new Promise((resolve) => {
            this.webrtcToken = {
                username: tokenData.username,
                token: tokenData.token,
                roomId: tokenData.room_id,
                expired: Date.now() + (12 * 60 * 60 * 1000)
            }

            localStorage.setItem(this.storageName, JSON.stringify(this.webrtcToken))

            resolve(true)
        })
    }

    return Helper.setup()
}
