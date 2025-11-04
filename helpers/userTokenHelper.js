
/**
 * @typedef {Object} TokenData
 * @property {string} username - The username associated with the token
 * @property {string} token - The authentication token
 * @property {number} expired - Token expiration timestamp
 */

module.exports = (options) => {

    const Helper = {
        webrtcToken: {
            username: null,
            token: null,
            expired: null,
            abilities: {},
        },
        storageName: 'codenidus.vidus.user.token',
    };

    /**
     * Initializes the helper instance with provided options
     */
    Helper.setup = () => {
        try {
            const data = localStorage.getItem(Helper.storageName);

            if (data) {
                Helper.webrtcToken = JSON.parse(data);
            }
        } catch (error) {
            console.warn('Failed to parse stored token:', error.message);
        }

        return Helper;
    };

    /**
     * Retrieves a valid token, generating a new one if necessary
     * @param {Function} [next] - Callback function to receive the token
     * @param {Function} [error] - Error handler callback
     * @returns {Promise<string|void>} The token if no callback provided
     */
    Helper.getToken = async (next, error) => {
        try {
            if (!Helper.webrtcToken.token || Helper.webrtcToken.expired < Date.now()) {
                await Helper.reGenerateToken();
            }

            if (typeof next === 'function') {
                return next(Helper.webrtcToken.token);
            }

            return Helper.webrtcToken.token;
        } catch (e) {
            if (options.configs.debug) {
                console.error('Failed to get webrtc token:', e);
            }

            if (typeof error === 'function') {
                return error(e);
            }

            throw e;
        }
    };

    /**
     * Forces generation of a new token regardless of current token state
     * @param {Function} [next] - Callback function to receive the token
     * @param {Function} [error] - Error handler callback
     * @returns {Promise<string|void>} The new token if no callback provided
     */
    Helper.forceGenerateToken = async (next, error = (e) => console.log(e)) => {
        try {
            await Helper.reGenerateToken();

            if (typeof next === 'function') {
                return next(Helper.webrtcToken.token);
            }

            return Helper.webrtcToken.token;
        } catch (e) {
            if (options.configs.debug) {
                console.error('Failed to force generate token:', e);
            }

            if (typeof error === 'function') {
                return error(e);
            }

            throw e;
        }
    };

    /**
     * Regenerates the token by making an API request
     * @private
     * @returns {Promise<boolean>} True if token was successfully regenerated
     * @throws {Error} If token regeneration fails
     */
    Helper.reGenerateToken = async () => {
        try {
            const requestOverride = options.overrides?.value?.helper?.userToken?.request || null;
            const baseUrl = requestOverride? '/' : options.configs.authorization.url;
            const apiClient = options.axios.getInstance(baseUrl);

            if (requestOverride) {
                const response = await requestOverride(apiClient, options.configs);
                await Helper.setToken(response);

                return true;
            } else {
                const token = localStorage.getItem(options.configs.authorization.token) || '';

                if(token === '') {
                    console.log('It seems that your authorization token is not stored in local storage.')
                }

                apiClient({
                    method: 'get',
                    url: options.configs.api_token_url,
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }).then(async response => {
                    await Helper.setToken(response.data.data)

                    return true;
                }, error => {
                    throw error;
                });
            }
        } catch(error) {
            throw error;
        }
    };

    /**
     * Removes the stored token from memory and localStorage
     */
    Helper.removeToken = () => {
        Helper.webrtcToken = {
            username: null,
            token: null,
            expired: null,
            abilities: {},
        };

        try {
            localStorage.removeItem(Helper.storageName);
        } catch (error) {
            console.warn('Failed to remove token from storage:', error.message);
        }
    };

    /**
     * Sets a new token and stores it in localStorage
     * @param {TokenData} tokenData - The token data to store
     * @returns {Promise<boolean>} True if token was successfully set
     */
    Helper.setToken = async (tokenData) => {
        Helper.webrtcToken = {
            username: tokenData.username,
            token: tokenData.token,
            expired: Date.now() + (12 * 60 * 60 * 1000),
            abilities: tokenData.abilities
        }

        localStorage.setItem(this.storageName, JSON.stringify(this.webrtcToken))

        try {
            localStorage.setItem(Helper.storageName, JSON.stringify(Helper.webrtcToken));
        } catch (error) {
            console.warn('Failed to store token in localStorage:', error.message);
        }

        return true;
    };

    Helper.checkAbility = (name) => {
        return (Helper.webrtcToken.abilities.hasOwnProperty(name) &&
          Helper.webrtcToken.abilities[name] === true);
    }

    return Helper.setup();
};
