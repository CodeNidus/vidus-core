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
    this.callback = {};
    this.configs = configs;
    this.axios = axios;
    this.actions = {};
    this.themes = {};
    this.options = {
      micMute: false,
    };
    this.overrides = {
      value: null
    };

    this.Room = require('./modules/Room.js')();
    this.Media = require('./modules/Media.js')();
    this.People = require('./modules/People.js')();
    this.Events = require('./modules/Events.js')();

    this.helpers = require('./helpers')({axios, configs}, this);

    if (configs.debug === true) {
      console.info('Vidus debug mode is enabled.');
    }
  }

  /**
   * Configure the WebRTC instance with options, callbacks, and user settings
   * @param {Object} params - Configuration parameters
   * @param {Object} params.options - Various options for the WebRTC instance
   * @param {Object} params.callback - Collection of callback functions
   * @param {Array} params.connections - Initial connections list
   * @param {Array} params.waitingList - Initial waiting list
   * @param {Object} params.userSettings - User-specific settings
   */
  setup({ options, callback, connections, waitingList, userSettings }) {
    this.options = Object.assign(this.options, options);
    this.callback = Object.assign(this.callback, callback);
    this.userSettings = userSettings;

    // Initialize modules with configuration
    this.Room.setup(this, options);
    this.Media.setup(this, options);
    this.People.setup(this, connections, waitingList, options);

    const setupEvent = new Event('codenidus-vidus-setup');
    document.dispatchEvent(setupEvent);
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
    configs.webrtc_url = configs.webrtc_url || this.configs.webrtc_url;

    this.actions = actions;
    this.themes = themes;
    this.configs = Object.assign(this.configs, configs);
    this.overrides.value = overrides;

    this.socket = new Socket();

    try {
      this.socket.initialize(configs);

      this.Events.setup(this);
      this.Events.listen();

      this.initialized = true;

      return true;
    } catch(error) {
      console.error('Error initializing WebRTC connection:', error);
      throw error;
    }
  }

  /**
   * Execute a callback function if it exists
   * @param {string} name - Name of the callback function
   * @param {Object} data - Data to pass to the callback
   * @param {string} consoleText - Message to log if callback is not defined
   */
  callbackAction(name, data = {}, consoleText = 'callback function not set.') {
    if (this.callback[name]) {
      this.callback[name](data);
    } else if (this.configs.debug) {
      console.log(consoleText);
    }
  }

  /**
   * Establish a socket connection with authentication
   * @param {string} token - Authentication token
   * @returns {Promise} - Resolves when connection is established
   */
  async openConnection(token) {
    return this.socket.setConnection(true, token);
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

      const setupEvent = new Event('codenidus-vidus-initial-peerjs')
      document.dispatchEvent(setupEvent)

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
      const connectionEvent = new Event('codenidus-vidus-new-connection', data);
      document.dispatchEvent(connectionEvent);

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
   * Request to execute a room action
   * @param {string} roomId - ID of the room
   * @param {string} action - Action to execute
   */
  runAction(roomId, action) {
    this.socket.emit('run-room-action', roomId, action);
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
   * Get available media devices
   * @returns {Promise<Array>} - Array of media devices
   */
  async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      return devices.filter(item => {
        return item.deviceId !== 'default' && item.deviceId !== 'communications';
      });
    } catch(error) {
      if (this.configs.debug) {
        console.error('Failed to get devices:', error);
      }

      return [];
    }
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
   * Create a new room
   * @param {Object} data - Room data
   * @returns {Promise} - Room creation result
   */
  createRoom(data) {
    return this.helpers.global.createRoom(data)
  }

  /**
   * Get list of available rooms
   * @returns {Promise<Array>} - List of rooms
   */
  getRoomsList() {
    return this.helpers.global.getRoomsList()
  }

}

const webrtc = new Webrtc()

export default webrtc;
