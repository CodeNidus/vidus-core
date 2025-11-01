
module.exports = (axios, configs, self) => {

    const Helper = {
        axios: null,
        configs: null,
        options: null,
        overrides: null,
        media: null,
        token: null,
        core: null,
    };

    /**
     * Initializes all sub-helpers and returns them in a single object
     */
    Helper.initialHelpers = (axios, configs, self) => {
        Helper.axios = axios;
        Helper.configs = configs;
        Helper.options = self.options;
        Helper.overrides = self.overrides;
        Helper.media = self.Media;
        Helper.core = self;
        Helper.token = require('./userTokenHelper')(Helper);

        return {
            userToken: Helper.token,
            global: require('./globalHelper')(Helper),
            canvasTextAction: require('./canvasTextAction')(Helper),
            faceApiAction: require('./faceApiAction')(Helper),
            ui: require('./uiHelper')(Helper),
            authenticatedRequest: Helper.authenticatedRequest,
            action: require('./actionHelper')(Helper),
        }
    };

    /**
     * Makes an authenticated HTTP request with user token
     * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
     * @param {string} url - The URL to request
     * @param {Object|null} [data=null] - Request data for POST, PUT, PATCH methods
     * @returns {Promise<any>} Response data from the API
     * @throws {Error} If the request fails or authentication token is unavailable
     */
    Helper.authenticatedRequest = async (method, url, data = null) => {
        try {
            const axios = Helper.axios.getInstance();
            const token = await Helper.token.getToken(false, false);

            const config = {
                method,
                url,
                headers: {
                    'user-token': token
                }
            };

            if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
                config.data = data;
            }

            const response = await axios(config);

            return response.data;
        } catch (error) {
            throw error;
        }
    };

    return Helper.initialHelpers(axios, configs, self);
};