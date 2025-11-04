module.exports = () => {

  const Room = {
    parent: null,
    information: null,
    options: null,
    actions: [],
  };

  /**
   * Setup the Room instance
   * @param {object} parent - Webrtc object
   * @param {object} options - Configuration options
   */
  Room.setup = (parent, options) => {
    Room.parent = parent;
    Room.options = options;
    Room.actions = [];
  };

  /**
   * User Join to Room
   * @param {string} roomId - ID of the room to join
   * @param {object} userData - User data
   */
  Room.join = (roomId, userData) => {
    const data = { peerJsId: Room.parent.peerJsId, ...userData };

    if (Room.parent.socket.isConnected()) {
      Room.parent.socket.emit('join-room', roomId, data);
    } else {
      Room.parent.socket.socket.once('connected', () => {
        Room.parent.socket.emit('join-room', roomId, data);
      });
    }
  };

  /**
   * User notify to server join room successfully
   * @param {string} roomId - ID of the room
   */
  Room.notifyJoinSuccess = (roomId) => {
    Room.parent.socket.emit('join-room-successfully', roomId, {
      peerJsId: Room.parent.peerJsId
    });
  };

  /**
   * User Left the Room
   * @param {object} [userData={}] - User data
   */
  Room.left = async (userData = {}) => {
    if (!Room.parent?.socket ||
      !Room.parent.socket.isConnected() ||
      !Room.information?.id) {
      return false;
    }

    const roomId = Room.information?.id;
    const data = { peerJsId: Room.parent.peerJsId, ...userData };

    try {
      Room.parent.People.closeAll();
      await Room.parent.Media.release();

      Room.parent.peerJs.disconnect();
      Room.parent.userSettings.shareMedia?.destroy();

      Room.parent.socket.emit('left-room', roomId, data, (data) => {
        Room.parent.closeConnection();
        Room.parent.socket = null;
      });

      return true;
    } catch(error) {
      if (parent.configs.debug) {
        console.log('Error to left the room!', roomId);
      }

      throw error;
    }
  };

  /**
   * Request to execute a room action
   * @param {object} action - Action to execute
   */
  Room.requestAction = (action) => {
    const roomId = Room.information?.id;

    if (!roomId || !action?.name) return;

    try {
      Room.parent.socket.emit('run-room-action', roomId, action);
    } catch(error) {
      throw error;
    }
  }

  /**
   * Execute a requested action
   * @param {object} action - The action to execute
   */
  Room.runRequestedAction = (action) => {
    const actionName = Room.parent.kebabToCamel(action.name);
    const index = Room.actions.findIndex(x => x.name === actionName);

    try {
      let actionItem;

      if(index > -1) {
        actionItem = Room.actions[index].item;
      } else {
        actionItem = (Room.parent.actions[actionName]?.script)?
            Room.parent.actions[actionName].script() :
            require('../actions/' + actionName + 'Action')();

        Room.actions.push({
          name: actionName,
          item: actionItem
        });
      }

      actionItem.run(Room.parent.getDevTools(), action);

      const eventName = actionName.charAt(0).toUpperCase() + actionName.slice(1);

      Room.parent.emit('on'+ eventName +'Action', {
        detail: action.attributes
      });
    } catch (error) {
      if (Room.parent.configs.debug) {
        console.log('Action run failed!', error);
      }

      throw error;
    }
  };

  return Room;
};
