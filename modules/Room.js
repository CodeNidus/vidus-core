module.exports = () => {

  const Room = {
    parent: null,
    information: null,
    options: null,
    actions: [],
  };

  Room.setup = (parent, options) => {
    this.parent = parent;
    this.options = options;
    this.actions = [];
  }

  /**
   * User Join to Room
   */
  Room.join = (roomId, userData) => {
    let data = Object.assign({ peerJsId: this.parent.peerJsId, }, userData)
    this.parent.socket.emit('join-room', roomId, data);
  }

  /**
   * User notify to server join room successfully
   */
  Room.notifyJoinSuccess = (roomId) => {
    this.parent.socket.emit('join-room-successfully', roomId, {
      peerJsId: this.parent.peerJsId
    });
  }

  /**
   * User Left the Room
   */
  Room.left = (roomId, userData = {}) => {
    this.parent?.People.closeAll();
    this.parent?.Media.release();

    this.parent?.peerJs.destroy();
    this.parent?.userSettings.shareMedia?.destroy();

    let data = Object.assign({ peerJsId: this.parent?.peerJsId, }, userData)

    this.parent?.socket.emit('left-room', roomId, data, (data) => {
      this.parent.socket.close();
      this.parent.socket = null;
    });
  }

  Room.runRequestedAction = (action) => {
    let actionName = this.parent.kebabToCamel(action.name);
    let index = this.actions.findIndex(x => x.name === actionName);

    try {
      let actionItem;

      if(index > -1) {
        actionItem = this.actions[index].item;
      } else {
        actionItem = (this.parent.actions[action.name] !== undefined)?
            this.parent.actions[action.name].script() :
            require('../actions/' + actionName + 'Action')();

        this.actions.push({
          name: actionName,
          item: actionItem
        });
      }

      actionItem.run(this.parent, action);

      const eventName = actionName.charAt(0).toUpperCase() + actionName.slice(1);
      const event = new CustomEvent('on'+ eventName +'Action', {
        detail: action.attributes
      });

      window.dispatchEvent(event);
    } catch (error) {
      console.log('action run failed!');
      console.log(error);
    }
  }

  return Room;
}
