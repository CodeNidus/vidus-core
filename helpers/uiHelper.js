/**
 * @typedef {Object} videoElementDetails
 * @property {string} reference
 * @property {HTMLVideoElement} videoItem
 * @property {HTMLElement} parent
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

module.exports = (options) => {

    const Helper = {
        options: options,
    };

    /**
     * Initializes the UI helper
     */
    Helper.setup = () => {
        Helper.options = options;
        return Helper
    };

    /**
     * Retrieves information about the current user's video element
     * @method
     * @return {videoElementDetails} video element details object
     */
    Helper.getCurrentUserVideo = () => {
        const reference = Helper.options.localVideoRef;
        const videoItem = document.getElementById(reference);

        const item = {
            reference: reference,
            videoItem: videoItem,
            parent: null,
            x: null,
            y: null,
            width: null,
            height: null,
        }

        if (videoItem) {
            const rect = item.videoItem.getBoundingClientRect();

            item.x = rect.x;
            item.y = rect.y;
            item.width = rect.width;
            item.height = rect.height;
            item.parent = item.videoItem.parentElement;
        }

        return item;
    };

    return Helper.setup(options);
};
