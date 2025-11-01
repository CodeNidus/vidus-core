
/**
 * Development shortcuts module for WebRTC functionality
 * Provides simplified method names for common WebRTC operations
 */
module.exports = (webrtc) => {

  const develop = {
    methods: new Map(),
    shortcuts: {}
  }

  /**
   * Initializes the development shortcuts module
   * @returns {Object} Shortcuts object
   */
  develop.initial = () => {
    develop._registerDevelopmentMethods();
    develop._exposeShortcuts();

    return develop.shortcuts;
  }

  /**
   * Registers all development shortcut methods
   * @private
   */
  develop._registerDevelopmentMethods = () => {
    const methods = {
      'core': webrtc,
      'getConfigs': () => ({ ...webrtc.configs }),
      'getPeerJsId': () => webrtc.peerJsId || null,
      'getSocket': () => webrtc.socket,
      'getConnections': () => ({ ...webrtc.People?.getConnections?.bind(webrtc.People) }),
      'emit': webrtc.emit?.bind(webrtc),
      'notify': webrtc.notify?.bind(webrtc),
      'leftRoom': webrtc.Room?.left?.bind(webrtc.Room),
      'muteCamera': () => webrtc.Media.muteCamera(true),
      'muteMicrophone': () => webrtc.Media.muteMicrophone(true),
      'unmuteCamera': () => webrtc.Media.muteCamera(false),
      'unmuteMicrophone': () => webrtc.Media.muteMicrophone(false),
      'getRequest': develop._getRequest,
      'getToken': webrtc.getUserToken?.bind(webrtc),
    };

    Object.entries(methods).forEach(([methodName, handler]) => {
      develop.methods.set(methodName, handler);
    });
  }

  /**
   * Exposes registered methods as shortcut properties
   * @private
   */
  develop._exposeShortcuts = () => {
    develop.methods.forEach((handler, methodName) => {
      develop.shortcuts[methodName] = handler;
    });
  };

  /**
   * Get axios request whit or whit out authenticated token
   * @param {Boolean} authenticated
   * @returns axios
   * @private
   */
  develop._getRequest = (authenticated = true) => {
    if (authenticated) {
      return webrtc.helpers.authenticatedRequest.bind(webrtc.helpers);
    } else {
      return webrtc.axios.getInstance();
    }
  }

  return develop.initial();
}
