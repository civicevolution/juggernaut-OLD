var util    = require("util");
var Client = require("./client");
Connection = module.exports = require("./klass").create();

Connection.include({
  init: function(stream){
    this.stream     = stream;
    this.session_id = this.stream.id;
    this.client     = Client.inst(this);

    this.stream.on("message", this.proxy(this.onmessage));
    this.stream.on("disconnect", this.proxy(this.ondisconnect));
  },
  
  onmessage: function(data){
    //util.log("connection.js Received: " + data);
    
    try {
      var message = Message.fromJSON(data);
    
      switch (message.type){
        case "subscribe":
          this.client.subscribe(message.getChannel());
					this.client.name = message.name;
          this.client.ape_code = message.ape_code;
        break;
        case "unsubscribe":
          this.client.unsubscribe(message.getChannel());
        break;
        case "meta":
          this.client.setMeta(message.data);
        break;
        case "event":
          this.client.event(message.data);
        break;
        case "publish":
          this.client.publish(message.getChannel(),message.data);
        break;
        default:
          throw "Unknown type"
      }
    } catch(e) { 
      util.error("Error!");
      util.error(e);
      return; 
    }
  },
  
  ondisconnect: function(){
    this.client.disconnect();
  },
  
  write: function(message){
    if (typeof message.toJSON == "function")
      message = message.toJSON();
    this.stream.send(message);
  }
});