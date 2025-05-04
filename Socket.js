import socketio from 'socket.io-client';

class SocketIO
{
  constructor() {
    this.socket = null;
    this.events = [];
    this.initialized = false;
  }

  async initial(options) {
    this.socket = socketio(options.webrtc_url, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket'],
    });
  }

  listen(event_name, callback) {
    if (this.initialized) {
      this.events.push(event_name);
      this.socket.on(event_name, callback);
    } else {
      callback('Socket Not Initialized yet');
    }
  }

  getEventsList() {
    return this.events;
  }

  connection(data, status = true) {
    this.socket.io.opts.query = {
      "user-token": data.token
    };

    if (!status) {
      this.events = [];
    }

    return status ? this.socket.open() : this.socket.close;
  }

  restoredCheck = {
    timeout: (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    restored: async () => {
      if (this.initialized) {
        return true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await this.restoredCheck.restored()
      }
    }
  }

  async restored() {
    return await this.restoredCheck.restored();
  }

  setEvent(name, next) {
    if(this.socket) {

    }
  }
}

export default SocketIO;

