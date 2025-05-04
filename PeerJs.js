import PeerJS from 'peerjs';
import configs from "./configs";


class VideoPeer
{
  constructor(Events) {
    return new Promise((resolve, reject) => {
      console.log()
      this.videoPeer = new PeerJS(undefined, {
        host: configs.peer_host,
        port: configs.peer_port,
        secure: /^true$/i.test(configs.peer_secure),
        referrerPolicy: '',
      }).on('open', (id) => {
        this.peerJsId = id;
        resolve(this);
      }).on('connection', (connection) => {
        connection.on('data', function(data) {
          data.peerJsId = connection.peer;
          Events.handler('peerJsData', data.event || 'unknown', data);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  screenShareConnection(status = false) {
    return new Promise((resolve, reject) => {
      if (status) {
        this.sharePeer = new PeerJS(undefined, {
          host: configs.peer_host,
          port: configs.peer_port,
          secure: /^true$/i.test(configs.peer_secure),
          referrerPolicy: '',
        }).on('open', (id) => {
          this.sharePeerJsId = id;
          resolve(this);
        }).on('error', (error) => {
          //
        });
      } else {
        if (this.sharePeer) this.sharePeer.destroy();
        this.sharePeerJsId = null;
        resolve(this);
      }
    });
  }

  getId() {
    return this.peerJsId;
  }
}

export default VideoPeer;
