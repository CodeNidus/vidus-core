import PeerJS from 'peerjs';
import configs from "./configs";


class VideoPeer
{
  constructor(Events, token) {
    this.initialize = false;
    this.initializeShareScreen = false;

    return new Promise((resolve, reject) => {

      this.videoPeer = new PeerJS(undefined, {
        host: configs.peer_host,
        port: configs.peer_port,
        secure: /^true$/i.test(configs.peer_secure),
        referrerPolicy: '',
        token: token,
      }).on('open', (id) => {
        this.peerJsId = id;

        this.videoPeer.socket.on('message', (data) => {
          if (data.type === 'welcome' && !this.initialize) {
            this.initialize = true;
            resolve(this);
          }
        })

      }).on('connection', (connection) => {
        connection.on('data', function(data) {
          data.peerJsId = connection.peer;
          Events.executeHandler('peerJsData', data.event || 'unknown', data);
        });
      }).on('error', (error) => {
        if (error.type === 'server-error') {
          const event = new CustomEvent('onPeerJsConnectionFailed', {
            detail: { message: error.message }
          });

          window.dispatchEvent(event);
        }
      }).on('disconnected', (d) => {

      });
    });
  }

  screenShareConnection(status = false, token = null) {
    return new Promise((resolve, reject) => {
      if (status) {
        this.sharePeer = new PeerJS(undefined, {
          host: configs.peer_host,
          port: configs.peer_port,
          secure: /^true$/i.test(configs.peer_secure),
          referrerPolicy: '',
          token: token,
        }).on('open', (id) => {
          this.sharePeerJsId = id;

          this.sharePeer.socket.on('message', (data) => {
            if (data.type === 'welcome' && !this.initializeShareScreen) {
              this.initializeShareScreen = true;
              resolve(this);
            }
          })
          resolve(this);
        }).on('error', (error) => {
          //
        });
      } else {
        if (this.sharePeer) this.sharePeer.destroy();
        this.sharePeerJsId = null;
        this.initializeShareScreen = false;
        resolve(this);
      }
    });
  }

  getId() {
    return this.peerJsId;
  }
}

export default VideoPeer;
