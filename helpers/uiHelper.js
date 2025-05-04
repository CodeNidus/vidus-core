
module.exports = (options) => {

    const Helper = {}

    Helper.setup = () => {
        this.axios = options.axios.getInstance()
        this.token = options.token
        this.configs = options.configs
        this.options = options.options

        return Helper
    }

    Helper.getCurrentUserVideo = () => {
        let reference = this.options.localVideoRef
        let videoItem = document.getElementById(reference)

        let item = {
            reference: reference,
            videoItem: videoItem,
            parent: null,
            x: null,
            y: null,
            width: null,
            height: null,
        }

        if (item.videoItem) {
            let rect = item.videoItem.getBoundingClientRect()

            item.x = rect.x
            item.y = rect.y
            item.width = rect.width
            item.height = rect.height
            item.parent = item.videoItem.parentElement
        }

        return item
    }

    return Helper.setup()
}
