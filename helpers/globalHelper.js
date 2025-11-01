
module.exports = (options) => {

    const Helper = {};

    Helper.setup = () => {
        return Helper
    };

    /**
     * Create a new room
     * @param {Object} data - Room creation data
     * @returns {Promise<Object>} Created room data
     * @throws {Error} If room creation fails
     */
    Helper.createRoom = async (data) => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid room data provided');
        }

        return await options.authenticatedRequest('POST', '/api/rooms', data);
    };

    /**
     * Retrieve list of rooms for the authenticated user
     * @returns {Promise<Array>} Array of room objects
     * @throws {Error} If fetching rooms fails
     */
    Helper.getRoomsList = async () => {
        return await options.authenticatedRequest('GET', '/api/rooms/user');
    };

    return Helper.setup();
};
