
module.exports = () => {
  const Events = {
    parent: null,
    events: [],
    eventHandlers: new Map()
  };

  /**
   * Set up the events manager with parent context
   * @param {Object} parent - The parent component/context
   */
  Events.setup = (parent) => {
    Events.parent = parent;
    Events.events = [];
  };

  /**
   * Register all socket event listeners
   * Sets up handlers for various room and user events
   */
  Events.listen = () => {
    if (!Events.parent.socket) {
      throw new Error('Socket not initialized.');
    }

    const eventHandlers = {
      // Room join/waiting list events
      'wait-accept-room-join': Events._handleWaitAcceptRoomJoin,
      'admit-user-to-join': Events._handleAdmitUserToJoin,
      'remove-user-from-waiting-list': Events._handleRemoveUserFromWaitingList,
      'connect-room-success': Events._handleConnectRoomSuccess,
      'room-information': Events._handleRoomInformation,
      // User connection events
      'user-connected': Events._handleUserConnected,
      'user-left-room': Events._handleUserLeftRoom,
      'user-disconnected': Events._handleUserDisconnected,
      // Room validation events
      'room-id-invalid': Events._handleRoomIdInvalid,
      // Action execution events
      'run-action': Events._handleRunAction,
      'successfully-run-action': Events._handleSuccessfullyRunAction,
      'failed-run-action': Events._handleFailedRunAction,
      // Moderation events
      'you-are-ban': Events._handleYouAreBan,
      // Debug events
      'info-room-data': Events._handleInfoRoomData
    };

    // Register all event handlers
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      Events.parent.socket.listen(eventName, handler.bind(Events));
      Events.eventHandlers.set(eventName, handler);
    });

    if (Events.parent.configs.debug) {
      console.log('All event listeners registered');
    }
  };


  /**
   * Add custom event handler
   * @param {string} type - Event type
   * @param {string} event - Event name
   * @param {Function} method - Event handler method
   */
  Events.addEventHandler = (type, event, method) => {
    if (typeof method !== 'function') {
      throw new Error('Event handler must be a function');
    }

    Events.events.push({
      type,
      event,
      method
    });

    if (Events.parent.configs.debug) {
      console.log(`Event handler added for ${type}:${event}`);
    }
  };

  /**
   * Execute event handler for specific type and event
   * @param {string} type - Event type
   * @param {string} event - Event name
   * @param {*} data - Event data (optional)
   * @returns {*} Handler return value or undefined if not found
   */
  Events.executeHandler = (type, event, data = null) => {
    const handler = Events.events.find(x => x.type === type && x.event === event);

    if (handler && typeof handler.method === 'function') {
      return handler.method(data);
    }

    if (Events.parent.configs.debug) {
      console.warn(`Handler not found for ${type} type ${event} event`);
    }

    return undefined;
  };


  /**
   * Handle waiting for room join acceptance
   * @param {Object} data - Event data
   * @private
   */
  Events._handleWaitAcceptRoomJoin = function(data) {
    Events.parent.emit('onRoomAdmitWait', data);
  };

  /**
   * Handle user admission to join room
   * @param {Object} data - User data
   * @private
   */
  Events._handleAdmitUserToJoin = function(data) {
    Events.parent.People.addToWaitingList(data);
    Events.parent.emit('onAdmissionRequest', data);
  };

  /**
   * Handle user removal from waiting list
   * @param {Object} data - User data with peerJsId
   * @private
   */
  Events._handleRemoveUserFromWaitingList = function(data) {
    Events.parent.People.removeFromWaitingListByPeerJsId(data.peerJsId);
    Events.parent.emit('onAdmissionCancel', data);
  };

  /**
   * Handle successful room connection
   * @param {Object} data - Connection data
   * @private
   */
  Events._handleConnectRoomSuccess = function(data) {
    Events.parent.emit('onRoomJoined', data);
  };

  /**
   * Handle room information updates
   * @param {Object} data - Room information data
   * @private
   */
  Events._handleRoomInformation = function(data) {
    Events.parent.Room.information = data;

    const user = data.users.find(user =>
      user.peerJsId === Events.parent.peerJsId
    );

    if (user && user.hasOwnProperty('roomCreator')) {
      Events.parent.userSettings.isCreator = user.roomCreator;
    }
  };

  /**
   * Handle new user connection
   * @param {Object} data - User data
   * @private
   */
  Events._handleUserConnected = function(data) {
    Events.parent.connectToNewUser(data);
    Events.parent.emit('onUserJoined', data);
  };

  /**
   * Handle user leaving room
   * @param {Object} data - User data
   * @private
   */
  Events._handleUserLeftRoom = function(data) {
    Events.parent.People.remove(data.peerJsId);
    Events.parent.emit('onRoomLeft', data);
  };

  /**
   * Handle user disconnection
   * @param {Object} data - User data
   * @private
   */
  Events._handleUserDisconnected = function(data) {
    Events.parent.People.remove(data.peerJsId);
    Events.parent.emit('onRoomLeft', data);
  };

  /**
   * Handle invalid room ID
   * @param {Object} data - Error data
   * @private
   */
  Events._handleRoomIdInvalid = function(data) {
    Events.parent.emit('onRoomInvalid', data);
  };

  /**
   * Handle action execution requests
   * @param {Object} action - Action to execute
   * @private
   */
  Events._handleRunAction = function(action) {
    Events.parent.Room.runRequestedAction(action);
  };

  /**
   * Handle successful action execution
   * @param {Object} action - Executed action
   * @private
   */
  Events._handleSuccessfullyRunAction = function(action) {
    if (Events.parent.configs.debug) {
      console.log('Action executed successfully:', action);
    }
  };

  /**
   * Handle failed action execution
   * @param {Object} action - Failed action
   * @private
   */
  Events._handleFailedRunAction = function(action) {
    if (Events.parent.configs.debug) {
      console.log('Action failed to execute:', action);
    }
  };

  /**
   * Handle user ban event
   * @param {Object} data - Ban information
   * @private
   */
  Events._handleYouAreBan = function(data) {
    Events.parent.emit('onRoomBanned', data);
  };

  /**
   * Handle room data info (debug)
   * @param {Object} data - Room data
   * @private
   */
  Events._handleInfoRoomData = function(data) {
    if (Events.parent.configs.debug) {
      console.log('Room data received:', data);
    }
  };

  return Events;
};
