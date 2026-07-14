import Socket from "./Socket.js"
import PeerJs from "./PeerJs.js"
import configs from "./configs"
import axios from "./Axios.js"

class Webrtc
{
  constructor() {
    this.socket = null;
    this.peerJs = null;
    this.userSettings = {};
    this.initialized = false;
    this.peerJsId = null;
    this.configs = configs;
    this.axios = axios;
    this.actions = {};
    this.themes = {};
    this.options = {
      micMute: false,
    };
    this.develop = {
      methods: {},
    };
    this.overrides = {
      value: null
    };

    this.Room = require('./modules/Room.js')();
    this.Media = require('./modules/Media.js')();
    this.People = require('./modules/People.js')();
    this.Events = require('./modules/Events.js')();

    this.helpers = require('./helpers')(axios, configs, this);

    const development = require('./modules/Development');
    this.develop.methods = development(this);

    if (configs.debug === true) {
      console.info('Vidus debug mode is enabled.');
    }
  }

  /**
   * Configure the WebRTC instance
   * @param {Object} params - Configuration parameters
   * @param {Object} params.options - Various options for the WebRTC instance
   * @param {Array} params.connections - Initial connections list
   * @param {Array} params.waitingList - Initial waiting list
   * @param {Object} params.userSettings - User-specific settings
   */
  setup({ options, connections, waitingList, userSettings }) {
    this.options = Object.assign(this.options, options);
    this.userSettings = userSettings;

    // Initialize modules with configuration
    this.Room.setup(this, options);
    this.Media.setup(this, options);
    this.People.setup(this, connections, waitingList, options);

    this.emit('onAppReady');
  }

  /**
   * Initialize the WebRTC connection with custom configurations
   * @param {Object} configs - Configuration overrides
   * @param {Object} actions - Custom actions
   * @param {Object} themes - Custom themes
   * @param {Object} overrides - Function overrides
   * @returns {Promise} - Resolves when initialization is complete
   */
  async initial(configs = {}, actions = {}, themes = {}, overrides = {}) {
    this.actions = actions;
    this.themes = themes;
    this.configs = Object.assign(this.configs, configs);
    this.overrides.value = overrides;

    // reset axios configuration
    axios.reSetConfig(this.configs);

    try {
      this.Events.setup(this);
      this.initialized = true;

      return true;
    } catch(error) {
      console.error('Error initializing WebRTC connection:', error);
      throw error;
    }
  }

  /**
   * Establish a socket connection with authentication
   * @param {string} token - Authentication token
   * @returns {Promise} - Resolves when connection is established
   */
  async openConnection(token) {
    try {
      this.socket = new Socket();
      this.socket.initialize(this.configs);
      this.Events.listen();

      return this.socket.setConnection(true, token);
    } catch(error) {
      console.error('Socket initializing error.');
      throw error;
    }
  }

  /**
   * Close the socket connection
   * @returns {Promise} - Resolves when connection is closed
   */
  closeConnection() {
    return this.socket.setConnection(false);
  }

  /**
   * Initialize PeerJS connection
   * @param {string} token - Authentication token
   * @returns {Promise<string>} - Resolves with the PeerJS ID
   */
  async initialPeerJs(token) {
    try {
      this.peerJs = await new PeerJs(this, token);
      this.peerJsId = this.peerJs.getId();
      this.emit('onPeerJsReady');

      return this.peerJsId;
    } catch(error) {
      console.error('Failed to initialize PeerJS:', error);
      throw error;
    }
  }

  /**
   * Start capturing user media and set up streaming
   * @param {Object} devices - Media devices to use
   * @returns {Promise<boolean>} - Resolves when media streaming is started
   */
  async startStreamUserMedia(devices) {
    try {
      const media = await this.Media.grab(
          devices,
          this.userSettings.camDisable,
          this.userSettings.micDisable,
      );

      this.userSettings.peerJsId = this.peerJsId;
      this.Media.streamVideo(null, media);

      return true;
    } catch(error) {
      console.error('Failed to start user media stream:', error);
      throw error;
    }
  }

  /**
   * Connect to a newly joined user
   * @param {Object} data - User data including peerJsId
   * @returns {Promise} - Resolves when connection is established
   */
  async connectToNewUser(data) {
    try {
      const connections = await this.peerJs.establishConnectionWithUser(data);
      this.emit('onUserConnected', data);

      connections.mediaConnection.on('close', () => {
        if (this.configs.debug) {
          console.log('Close user...' + data.peerJsId);
        }
      });

      connections.mediaConnection.on('error', (error) => {
        if (this.configs.debug) {
          console.log('error user... ' + error);
        }
      });

      return true;
    } catch(error) {
      if (this.configs.debug) {
        console.error('Failed to connect to new user:', error);
      }

      throw error;
    }
  }

  /**
   * Register an event handler
   * @param {string} type - Event type
   * @param {string} event - Event name
   * @param {Function} method - Event handler function
   */
  on(type, event, method) {
    this.Events.addEventHandler(type, event, method);
  }

  /**
   * Convert camelCase to kebab-case
   * @param {string} name - String in camelCase
   * @returns {string} - String in kebab-case
   */
  camelToKebab(name) {
    return name.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  }

  /**
   * Convert kebab-case to camelCase
   * @param {string} name - String in kebab-case
   * @returns {string} - String in camelCase
   */
  kebabToCamel(name) {
    return name.replace(/-[a-z]/g, m => m.slice(1).toUpperCase());
  }

  /**
   * Check if the current device is a mobile device
   * @returns {boolean} - True if mobile device
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if the browser is Firefox
   * @returns {boolean} - True if Firefox
   */
  isFirefox() {
    return /firefox/i.test(navigator.userAgent);
  }

  /**
   * Display a notification to the user with optional override functionality
   * If debug mode is enabled, logs the notification to the console
   * Uses a custom notification handler if provided via overrides, otherwise falls back to alert()
   *
   * @param {string} title - The title or category of the notification (logged in debug mode)
   * @param {string} text - The main notification message content to display
   * @returns {void}
   */
  notify(title, text) {
    const notifyOverride = this.overrides.value?.notify || null
    if (notifyOverride && typeof notifyOverride === 'function') {
      notifyOverride(title, text);
    } else {
      console.info(title, ':', text);
    }
  }

  /**
   * Get user authentication token
   * @param {Function} next - Success callback
   * @param {Function} error - Error callback
   * @returns {Promise} - Authentication token
   */
  getUserToken(next = (token) => {return token}, error = (e) => console.log(e)) {
    return this.helpers.userToken.getToken(next, error)
  }

  /**
   * Check user has a specific ability
   * @param name
   * @returns {boolean}
   */
  can(name) {
    return this.helpers.userToken.checkAbility(name);
  }

  /**
   * Create a new room
   * @param {Object} data - Room data
   * @returns {Promise} - Room creation result
   */
  createRoom(data) {
    return this.helpers.global.createRoom(data);
  }

  /**
   * Get list of available rooms
   * @returns {Promise<Array>} - List of rooms
   */
  getRoomsList() {
    return this.helpers.global.getRoomsList();
  }

  /**
   * Trigger custom event
   * @param {string} type
   * @param {object} data (optional)
   * @private
   */
  emit(type, data = {}) {
    if (typeof data !== 'object') {
      data = { detail: data };
    } else if (!data?.detail) {
      data = { detail: { ...data} };
    }

    const event = new CustomEvent(type, data);
    document.dispatchEvent(event);
  }

  /**
   * Get development shortcuts methods
   */
  getDevTools() {
    return this.develop.methods;
  }

  /**
   * Get action by name
   * @param {string} name - action name
   * @param {object} attributes - action attributes
   * @param {array} users - action users
   * @param {boolean} moderator - action moderator type
   * @return Action
   */
  getAction(name, attributes = {}, users = [], moderator = false) {
    const actionName = this.camelToKebab(name);
    return this.helpers.action.getAction(actionName, attributes, users, moderator);
  }

  /**
   * Register action component reference
   * @param {string} name
   * @param {object} object
   */
  registerActionReference(name, object) {
    const actionName = this.camelToKebab(name);

    if (!this.actions[actionName]) {
      this.actions[actionName]= {
        name: actionName,
        script: null,
        view: null,
        reference: object
      };
    } else if (!this.actions[actionName].reference) {
      this.actions[actionName].reference = object;
    }
  }
}

const webrtc = new Webrtc();

export default webrtc;
