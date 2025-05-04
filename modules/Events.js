const configs = require("../configs");

module.exports = () => {
  const Events = {
    parent: null,
    socket: null,
    events: [],
  };

  Events.setup = (parent) => {
    this.parent = parent;
    this.socket = this.parent.socket;
    this.events = [];
  }

  Events.listen = () => {
    this.socket.on('wait-accept-room-join', (data) => {
      const event = new CustomEvent('onWaitUntilAdmit', {
        detail: data
      });

      window.dispatchEvent(event);
    });

    this.socket.on('admit-user-to-join', (data) => {
      this.parent.People.addToWaitingList(data);

      const event = new CustomEvent('onRequestToAdmit', {
        detail: data
      });

      window.dispatchEvent(event);
    });

    this.socket.on('remove-user-from-waiting-list', (data) => {
      this.parent.People.removeFromWaitingListByPeerJsId(data.peerJsId);

      const event = new CustomEvent('onCancelForAdmit', {
        detail: data
      });

      window.dispatchEvent(event);
    });

    this.socket.on('connect-room-success', (data) => {
      const event = new CustomEvent('onConnectToRoomSuccess', {
        detail: data
      });

      window.dispatchEvent(event);
    });



    this.socket.on('room-information', (data) => {
      this.parent.Room.information = data;

      let index = data.users.findIndex(x => x.peerJsId === this.parent.peerJsId);

      if(index > -1 && data.users[index].hasOwnProperty('roomCreator')) {
        this.parent.userSettings['isCreator'] = data.users[index].roomCreator;
      }
    });

    this.socket.on('user-connected', (data) => {
      this.parent.connectToNewUser(data);
      this.parent.callbackAction('joinRoom', data, 'user join room.');
    });

    this.socket.on('user-left-room', (data) => {
      this.parent.People.remove(data);
      this.parent.callbackAction('leftRoom', data, 'user left room.');
    });

    this.socket.on('user-disconnected', (data) => {
      this.parent.People.remove(data);
      this.parent.callbackAction('leftRoom', data, 'user disconnected.');
    });

    this.socket.on('room-id-invalid', (data) => {
      this.parent.callbackAction('invalidRoom', data, 'room id is invalid!');
    });

    this.socket.on('run-action', (action) => {
      this.parent.Room.runRequestedAction(action);
    });

    this.socket.on('successfully-run-action', (action) => {
      if (configs.debug) {
        console.log('Action run successfully!');
        console.log(action);
      }
    });

    this.socket.on('failed-run-action', (action) => {
      if (configs.debug) {
        console.log('Action failed to run!');
        console.log(action);
      }
    });

    this.socket.on('you-are-ban', (data) => {
      this.parent.callbackAction('banInRoom', data, 'you are ban!!!');
    });

    this.socket.on('info-room-data', (data) => {
      if (configs.debug) {
        console.log(data);
      }
    });
  }


  Events.addEvent = (type, event, method) => {
    this.events.push({
      type: type,
      event: event,
      method: method
    });
  }

  Events.handler = (type, event, data = null) => {
    let index = this.events.findIndex(x => x.type === type && x.event === event);

    if (index > -1) {
      return this.events[index]['method'](data);
    } else {
      if (configs.debug) {
        console.log(type + ' type ' + event + ' event not defined.');
      }
    }
  }

  return Events;

}
