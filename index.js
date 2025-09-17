import Socket from "./Socket.js"
import PeerJs from "./PeerJs.js"
import configs from "./configs"
import axios from "./Axios.js"

class Webrtc
{
  constructor() {
    this.socket = null
    this.peerJs = null
    this.userSettings = {}
    this.initialized = false
    this.peerJsId = null
    this.options = {}
    this.callback = {}
    this.configs = configs
    this.axios = axios
    this.actions = {}
    this.themes = {}
    this.overrides = {
      value: null
    }

    this.Room = require('./modules/Room.js')()
    this.Media = require('./modules/Media.js')()
    this.People = require('./modules/People.js')()
    this.Events = require('./modules/Events.js')()

    this.helpers = require('./helpers')({axios, configs}, this)

    this.options.micMute = false

    if (configs.debug === true) {
      console.info('Vidus debug mode is enable.')
    }
  }

  setup({ options, callback, connections, waitingList, userSettings }) {
    this.options = Object.assign(this.options, options)
    this.callback = Object.assign(this.callback, callback)
    this.userSettings = userSettings

    this.Room.setup(this, options)
    this.Media.setup(this, options)
    this.People.setup(this, connections, waitingList, options)

    this.on('peerJsData', 'screenShare', this.Media.screenShare.closeScreenShare)
    this.on('peerJsData', 'recordScreen', this.Media.screenRecord.setStatus)

    const setupEvent = new Event('codenidus-vidus-setup')
    document.dispatchEvent(setupEvent)
  }

  async initial(configs = {}, actions = {}, themes = {}, overrides = {}) {
    configs.webrtc_url = configs.webrtc_url || this.configs.webrtc_url;

    this.actions = actions
    this.themes = themes
    this.configs = Object.assign(this.configs, configs)
    this.overrides.value = overrides

    this.socket = new Socket();

    try {
      this.socket.initialize(configs);

      this.Events.setup(this);
      this.Events.listen();

      // set events
      this.on('peerJsData', 'muteMedia', this.Media.setConnectionMediaStatus);
    } catch(error) {
      console.error('Error initializing WebRTC connection:', error);
      throw error;
    }
  }

  callbackAction(name, data = {}, consoleText = 'callback function not set.') {
    if (!!this.callback[name]) {
      this.callback[name](data);
    } else {
      console.log(consoleText);
    }
  }

  /**
   * Start user Socket Connection
   */
  async openConnection(token) {
    return this.socket.setConnection(true, token);
  }

  /**
   * Close user Socket Connection
   */
  closeConnection() {
    return this.socket.setConnection(false);
  }

  /**
   * Start PeerJs Connection
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
   * Start grab user media and stream
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
   * Connect To New Joined User
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
   * Request to run user action
   */
  runAction(roomId, action) {
    this.socket.emit('run-room-action', roomId, action);
  }

  /**
   * Define event
   */
  on(type, event, method) {
    this.Events.addEventHandler(type, event, method);
  }

  async getDevices() {
    try {
      return await navigator.mediaDevices.enumerateDevices().then(devices => {
        return devices.filter(item => {
          return item.deviceId !== 'default' && item.deviceId !== 'communications';
        });
      })
    } catch(error) {
      console.log(error);
      return [];
    }
  }


  camelToKebab(name) {
    name = name.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

    return name;
  }

  kebabToCamel(name) {
    name = name.replace(/-[a-z]/g, m => m.slice(1).toUpperCase());

    return name;
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  isFirefox() {
    return /firefox/i.test(navigator.userAgent);
  }

  notify(title = null, text = null) {
    console.log(title, ': ', text);
    alert(text);
  }

  getUserToken(next = (token) => {return token}, error = (e) => console.log(e)) {
    return this.helpers.userToken.getToken(next, error)
  }

  createRoom(data) {
    return this.helpers.global.createRoom(data)
  }

  getRoomsList() {
    return this.helpers.global.getRoomsList()
  }

}

const webrtc = new Webrtc()

export default webrtc;
