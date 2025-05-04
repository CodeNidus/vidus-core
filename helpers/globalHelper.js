
module.exports = (options) => {

    const Helper = {}

    Helper.setup = () => {
        this.axios = options.axios.getInstance()
        this.token = options.token
        this.configs = options.configs

        return Helper
    }

    Helper.createRoom = (data) => {
        return new Promise((resolve, reject) => {
            this.token.getToken((token) => {

                this.axios.post('/api/rooms', data, {
                    headers: {
                        'user-token': token
                    }
                }).then(response => {
                    resolve(response.data)
                }, error => {
                    reject(error.response.data)
                })
            })
        })
    }

    Helper.getRoomsList = () => {
        return new Promise((resolve, reject) => {
            this.token.getToken((token) => {

                this.axios.get('/api/rooms/user', {
                    headers: {
                        'user-token': token
                    }
                }).then(response => {
                    resolve(response.data)
                }, error => {
                    reject(error.response.data)
                })
            })
        })
    }

    return Helper.setup()
}
