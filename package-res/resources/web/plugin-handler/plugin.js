/**
 * Pentaho Plugin
 * CONFIG = {
 *		onRegister : function(plugin) {},
 *		onUnregister : function(plugin) {}
 *		pluginHandler : PluginHandlerInstance
 * }
 */

var deps = [
	'common-ui/PluginHandler',
	'common-ui/ring'
]

pen.define(deps, function(PentahoPluginHandler) {
	// Generates a guid for use with plugins
	function _guid() {
		function S4() {
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		}
		return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	}

	var PentahoPlugin = ring.create({

		init : function(config) {
			this.id = _guid();
			this.config = config;

			if (!this.config.pluginHandler) { 
				throw "There is not a pluginHandler provided in the configuration"
			}

			if (!ring.instance(this.config.pluginHandler, PentahoPluginHandler)) {
				throw "The attached plugin handler is not a Pentaho Plugin Handler"
			}
		},
		
		/**
         * Registers this Plugin with the PentahoPluginHandler
         *
         * @return PentahoPluginHandler.Plugin
         * @throws Exception
         *        As defined in the register function for PentahoPluginHandler
         */
		register : function() {
			return this.config.pluginHandler.register(this);
		},

		/**
         * Unregisters this Plugin with the PentahoPluginHandler
         *
         * @return PentahoPluginHandler.Plugin
         * @throws Exception
         *        As defined in the register function for PentahoPluginHandler
         */
		unregister : function() {
			return this.config.pluginHandler.unregister(this);
		},

		/**
         * Performs any onRegister functionality defined when creating this object
         */
		onRegister : function(plugin) {
			if (this.config.onRegister) {
				this.config.onRegister.call(plugin, plugin);
			}
		},

		/**
         * Performs any onUnregister functionality defined when creating this object
         */
		onUnregister : function() {
			if (this.config.onUnregister) {
				this.config.onUnregister.call(plugin, plugin);
			}
		},

		/**
         * Performs a toString operation for this object
         *
         * @return String
         */
		toString : function() {
			return "PLUGIN[" + this.id + "]";
		}
	});

	return PentahoPlugin;
})