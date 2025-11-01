module.exports = (options) => {
  const Helper = {};

  class Action
  {
    _action = null;
    _peerJsId = null;

    _actionItem = {
      name: null,
      moderator: true,
      users: [],
      attributes: {
        peerJsId: null,
      }
    };

    constructor(name, attributes = {}, users = [], moderator = false)
    {
      const actionName = options.core.camelToKebab(name);

      this._peerJsId = options.core.peerJsId;
      this._action = options.core.actions[actionName]?.reference || undefined;

      this.setName(name);
      this.setAttributes(attributes);
      this.setUsers(users);
      this.setAsModeratorAction(moderator);
    }

    /**
     * Set action name in item
     * @param {String} name
     */
    setName(name)
    {
      this._actionItem.name = name;
    }

    /**
     * Set action attributes in item
     * @param {Object} attributes
     */
    setAttributes(attributes)
    {
      this._actionItem.attributes = {
        ...attributes,
     //   peerJsId: this._peerJsId
      };
    }

    /**
     * Set action attributes in item
     * @param {Array} users
     */
    setUsers(users)
    {
      if (typeof users === 'string') {
        users = [{
          peerJsId: users
        }];
      }

      if (!Array.isArray(users)) {
        users = [users];
      }

      this._actionItem.users = users.filter(item =>
        typeof item === 'object' &&
        item !== null &&
        item.hasOwnProperty('peerJsId')
      );
    }

    /**
     * Set action attributes in item
     * @param {Boolean} status
     */
    setAsModeratorAction(status = true)
    {
      this._actionItem.moderator = status;
    }

    /**
     * Return action item object
     * @returns { Object }
     */
    getActionItem()
    {
      return ({ ...this._actionItem});
    }

    /**
     * Return action item string
     * @returns { String }
     */
    toString() {
      return JSON.stringify(this._actionItem);
    }

    /**
     * Emit requested action to server
     */
    request() {
      options.core.Room.requestAction(this._actionItem);
    }

    /**
     * Run requested action component
     */
    run(...args) {
      if (!this._action) return;
      this._action.run(...args);
    }
  }

  Helper.getAction = (name, attributes = {}, users = [], moderator = false) => {
    return new Action(name, attributes, users, moderator);
  }

  return Helper;
}