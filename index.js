import Socket from "./Socket.js"
import PeerJs from "./PeerJs.js"
import configs from "./configs"
import axios from "./Axios.js"

class Webrtc
{
  constructor() {
    this.socketObject = null
    this.peerJsObject = null
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

    this.socketObject = new Socket()
    this.socketObject.initial(configs).then(() => {
      this.socketObject.initialized = true
      this.socket = this.socketObject.socket

      this.Events.setup(this)
      this.Events.listen()

      // set events
      this.on('peerJsData', 'muteMedia', this.Media.setConnectionMediaStatus)

    }).catch(err => {
      console.log('error happened for webrtc initial', err)
    })
  }

  callbackAction(name, data = {}, consoleText = 'callback function not set.') {
    if (!!this.callback[name]) {
      this.callback[name](data);
    } else {
      console.log(consoleText);
    }
  }

  /**
   * Start User Socket Connection
   */
  connection(data, status = true) {
    this.socket.io.opts.query = {
      "user-token": data.token
    };

    return status ? this.socket.open() : this.socket.close;
  }

  /**
   * Start PeerJs Connection
   */
  async initialPeerJs() {
    return new Promise(async (resolve, reject) => {
      try {
        await new PeerJs(this.Events).then((peerJsObject) => {
          this.peerJsObject = peerJsObject;
          this.peerJs = this.peerJsObject.videoPeer;
          this.peerJsId = this.peerJsObject.getId();

          resolve(this.peerJsId);
        });
      } catch(error) {
        reject(error);
      }
    });
  }

  /**
   * Start grab user media and stream
   */
  startStreamUserMedia(devices) {
    return new Promise((resolve, reject) => {
      try {
        this.Media.grab(
            devices,
            this.userSettings.camDisable,
            this.userSettings.micDisable,
        ).then((media) => {
          this.peerJs.on('call', async (mediaConnection) => {
            if (mediaConnection.metadata?.type === 'screen-sharing') {
              this.People.setData(mediaConnection.peer, 'shareMediaConnection', mediaConnection, {
                customKey: 'sharePeerJsId'
              });

              mediaConnection.on('stream', peerVideoStream => {
                this.Media.streamVideo(null, peerVideoStream, {
                  customReference: 'screen-sharing-video',
                  videoMute: false,
                  eventListener: false,
                });

                let shareScreen = document.getElementById(this.options.screenShareRef);
                shareScreen.style.display = 'block';
                this.Media.screenShare.eventTrigger(true);
              });

              this.People.setData(mediaConnection.metadata?.peerJsId, 'share', true);
              this.People.setData(mediaConnection.metadata?.peerJsId, 'sharePeerJsId', mediaConnection.metadata?.sharePeerJsId);

              mediaConnection.answer();
            } else {
              const dataConnection = this.peerJs.connect(mediaConnection.peer);
              await this.People.add(mediaConnection, dataConnection);
              mediaConnection.answer(this.Media.userMedia);
            }
          });

          this.userSettings.peerJsId = this.peerJsId;
          this.Media.streamVideo(null, media);
          resolve(true);
        });
      } catch(error) {
        reject(error);
      }
    });
  }

  /**
   * Connect To New Joined User
   */
  async connectToNewUser(data) {
    const mediaConnection = this.peerJs.call(data.peerJsId, this.Media.userMedia);
    const dataConnection = this.peerJs.connect(data.peerJsId);

    await this.People.add(mediaConnection, dataConnection, data);

    // share screen
    if (this.userSettings.share) {
      this.Media.screenShare.callToNewJoinedUser(data.peerJsId);
    }

    mediaConnection.on('close', () => {
      console.log('Close user...' + data.peerJsId);
    });
    mediaConnection.on('error', (error) => {
      console.log('error user... ' + error);
    });
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
    this.Events.addEvent(type, event, method);
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

  notify(title, text) {
    console.log(title, ': ', text);
    alert(text);
  }

  getUserToken(next, error = (e) => console.log(e)) {
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
