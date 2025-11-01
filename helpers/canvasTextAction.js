/**
 * @module CanvasTextHelper
 * @description A helper module for managing canvas text operations including storage,
 * retrieval, and API interactions for text content.
 */

/**
 * @typedef {Object} TextFileItem
 * @property {string} file - The file identifier
 * @property {boolean} loading - Loading state indicator
 */

module.exports = (options) => {

    const Helper = {
        storageName: 'codenidus.vidus.canvasTextAction',
    };

    Helper.setup = () => {
        return Helper;
    };

    /**
     * Fetches text content from the server using a specific key/URL
     * @param {string} url - The key or URL identifier for the text content
     * @returns {Promise<any>} The text content from the server
     * @throws {Error} If the request fails
     */
    Helper.copyText = async (url) => {
        try {
            return await options.authenticatedRequest('GET', `/api/canvas-text-get?key=${url}`);
        } catch (error) {
            throw error;
        }
    };

    /**
     * Retrieves text files from a specific room/bucket on the server
     * @param {string} roomId - The identifier of the room/bucket to fetch files from
     * @returns {Promise<TextFileItem[]>} Array of text file items with loading states
     * @throws {Error} If the request fails
     */
    Helper.getTextFromBucket = async (roomId) => {
        try {
            const response = await options.authenticatedRequest('GET', `/api/canvas-text-list?roomId=${roomId}`);
            return response.files.map(item => {
                return {
                    file: item,
                    loading: false,
                }
            });
        } catch (error) {
            throw error;
        }
    };

    /**
     * Retrieves text history from browser's local storage
     * @returns {Array} Array of stored text history items, or empty array if none exists
     */
    Helper.getTextFromStorage = () =>  {
        const store = JSON.parse(localStorage.getItem(Helper.storageName));
        return (!store) ? [] : store.history;
    };

    /**
     * Stores text items in browser's local storage
     * @param {Array} items - Array of text items to store
     * @returns {void}
     */
    Helper.storeTextInStorage = (items) =>  {
        localStorage.setItem(Helper.storageName, JSON.stringify({
            history: items
        }));
    };

    return Helper.setup();
};
