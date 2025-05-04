
module.exports = ({axios, configs}, self) => {

    const Helper = {}

    Helper.setup = ({axios, configs}, self) => {
        this.axios = axios
        this.configs = configs
		this.options = self.options
        this.overrides = self.overrides
        this.media = self.Media
        this.token = {}
    }

    Helper.initialHelpers = ({axios, configs}, self) => {
        Helper.setup({axios, configs}, self)

        this.token = require('./userTokenHelper')(this)

        return {
            userToken: this.token,
            global: require('./globalHelper')(this),
            canvasTextAction: require('./canvasTextAction')(this),
            faceApiAction: require('./faceApiAction')(this),
			ui: require('./uiHelper')(this),
        }
    }

    return Helper.initialHelpers({axios, configs}, self)
}