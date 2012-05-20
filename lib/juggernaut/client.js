var util     = require("util");
var Channel = require("./channel");
var Events  = require("./events");

Client = module.exports = require("./klass").create();

Client.include({
  init: function(conn){
    this.connection = conn;
    this.session_id = this.connection.session_id;
  },
  
  setMeta: function(value){
    this.meta = value;
  },
  
  event: function(data){
    Events.custom(this, data);
  },

  publish: function(channel,data){
    //util.log("client.js publish channel: " + channel);
  	var msg = {
  	  "channels": [channel],
  	  "data": data,
  	  "only": data.only
  	};
  	_AUTH._redis_client.publish("juggernaut", JSON.stringify(msg));
  },
  
  subscribe: function(name){
    //util.log("Client subscribing to: " + name);
    
		var ror_session_id = this.connection.stream.manager.settings._ror_session_id
		//util.log("Check if session_id: " + ror_session_id + " can subscribe to channel: " + name );
		_AUTH_client_this = this;
		_AUTH._redis_client.sismember(name, ror_session_id, function(e,c){_AUTH_client_this.authorize_subscribe(e,c,name,_AUTH_client_this)} );
  },

	authorize_subscribe: function(err,isMember,name,_client_this){
		if(isMember){
			util.log("Subscribe session_id: " + _client_this.connection.stream.manager.settings._ror_session_id + " to channel: " + name)
			var channel = Channel.find(name);
			channel.subscribe(_client_this);
		}else{
			util.log("Do not subscribe session_id: " + _client_this.connection.stream.manager.settings._ror_session_id + " to channel: " + name)
		}
	},

  unsubscribe: function(name){
    //util.log("Client unsubscribing from: " + name);

    var channel = Channel.find(name);
    channel.unsubscribe(this);
  },
    
  write: function(message){
    if (message.except) {
      var except = Array.makeArray(message.except);
      if (except.include(this.session_id))
        return false;
    }
    
    this.connection.write(message);
  },
  
  disconnect: function(){
    // Unsubscribe from all channels
    Channel.unsubscribe(this);
  }
});