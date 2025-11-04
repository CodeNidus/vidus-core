import PeerJS from 'peerjs';
import configs from "./configs";

class VideoPeer
{
  constructor(parent, token) {
    this.initialize = false;
    this.connectionDelay = 10000;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.peerJsId = null;
    this.videoPeer = null;
    this.parent = parent;
    this.token = token;

    return new Promise((resolve, reject) => {
      this.initializeVideoPeer(resolve, reject);
    });
  }

  /**
   * Initializes the main video peer connection
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   * @private
   */
  initializeVideoPeer(resolve, reject) {
    try {
      this.videoPeer = this.createPeerJsInstance();

      this.parent.on('peerJsData', 'muteMedia', this.parent.Media.setConnectionMediaStatus);

      this.videoPeer.on('open', (id) => {
        this.peerJsId = id;
        this.resetReconnectionState();

        // Listen for welcome message to confirm connection
        this.videoPeer.socket.on('message', (data) => {
          if (data.type === 'welcome' && !this.initialize) {
            this.initialize = true;
            resolve(this);
          }
        });
      });

      this.videoPeer.on('connection', (connection) => {
        connection.on('data', (data) => {
          data.peerJsId = connection.peer;
          this.parent.Events.executeHandler('peerJsData', data.event || 'unknown', data);
        });
      });

      this.videoPeer.on('error', (error) => {
        if (error.type === 'server-error') {
          this.dispatchPeerConnectionFailedEvent(error);
        }

        if (!this.initialize) {
          reject(error);
        }
      });

      this.videoPeer.on('disconnected', () => {
        if (configs.debug) {
          console.log('Peer connection disconnected, attempting to reconnect...');
        }

        this.attemptReconnection();
      });

      this.videoPeer.on('call', async (mediaConnection) => {
        if (mediaConnection.metadata?.type) return;

        const dataConnection = this.videoPeer.connect(mediaConnection.peer);

        await this.parent.People.add(mediaConnection, dataConnection);

        mediaConnection.answer(this.parent.Media.userMedia);
      });

      setTimeout(() => {
        if (!this.initialize) {
          this.dispatchPeerConnectionFailedEvent({
            message: 'Peer connection timeout'
          });

          reject(new Error('Peer connection timeout'));
        }
      }, this.connectionDelay);
    } catch (error) {
      reject(new Error(`Failed to initialize video peer: ${error.message}`));
    }
  }

  /**
   * Attempts to reconnect to the PeerJS server with exponential backoff
   * @private
   */
  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (configs.debug) {
        console.error('Max reconnection attempts reached');
      }

      this.dispatchPeerConnectionFailedEvent(
        new Error('Failed to reconnect after ' + this.maxReconnectAttempts + ' attempts')
      );
      return;
    }

    setTimeout(() => {
      if (this.videoPeer && this.videoPeer.disconnected) {
        if (configs.debug) {
          console.log('Reconnection attempt ' + (this.reconnectAttempts + 1));
        }

        try {
          this.videoPeer.reconnect();

          this.reconnectAttempts++;

          this.reconnectDelay = Math.min(
            30000,
            this.reconnectDelay * 2 + Math.random() * 1000
          );
        } catch (error) {
          if (configs.debug) {
            console.log('Reconnection failed:', error.message);
          }
        }
      }
    }, this.reconnectDelay);
  }

  /**
   * Resets reconnection state after successful connection
   * @private
   */
  resetReconnectionState() {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  /**
   * Creates and returns a new PeerJS instance with configured settings
   * @returns {PeerJS} A new PeerJS instance
   */
  createPeerJsInstance() {
    return new PeerJS(undefined, {
      host: configs.peer_host,
      port: configs.peer_port,
      secure: /^true$/i.test(configs.peer_secure),
      referrerPolicy: '',
      token: this.token,
    });
  }


  /**
   * Dispatches a custom event when PeerJS connection fails
   * @param {Error} error - The error object containing failure details
   */
  dispatchPeerConnectionFailedEvent(error) {
    this.parent.emit('onPeerJsConnectionFailed', {
      detail: { message: error.message }
    });
  }

  /**
   * Gets the main peer connection ID
   * @returns {string|null} The peer ID or null if not connected
   */
  getId() {
    return this.peerJsId;
  }

  listen(eventName, callback) {
    this.videoPeer.on(eventName, callback);
  }

  async establishConnectionWithUser(data) {
    try {
      const mediaConnection = this.videoPeer.call(data.peerJsId, this.parent.Media.userMedia);
      const dataConnection = this.videoPeer.connect(data.peerJsId);

      await this.parent.People.add(mediaConnection, dataConnection, data);

      return {
        mediaConnection,
        dataConnection
      };
    } catch(error) {
      if (this.parent.configs.debug) {
        console.error('Error establishing a user connection.', error);
      }

      throw error;
    }
  }

  disconnect() {
    this.videoPeer.destroy();
  }
}

export default VideoPeer;
