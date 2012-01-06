var http     = require("http");
var https    = require("https");
var util      = require("util");
var path     = require("path");
var fs       = require("fs");
var io       = require("socket.io");
var nstatic  = require("node-static-maccman");
var Connection = require("./connection");
var redis   = require("./redis");

var credentials;
var keysPath = __dirname + "/keys";
if (path.existsSync(keysPath + "/privatekey.pem") && path.existsSync(keysPath + "/certificate.pem")) {
  var privateKey = fs.readFileSync(keysPath + "/privatekey.pem", "utf8");
  var certificate = fs.readFileSync(keysPath + "/certificate.pem", "utf8");
  credentials = {key: privateKey, cert: certificate};
}

Server = module.exports = require("./klass").create();

var fileServer = new nstatic.Server(path.normalize(__dirname + "../../../public"));

_AUTH = {};

Server.include({
  init: function(){
    var connectionListener = function(request, response){
      request.addListener("end", function() {

        fileServer.serve(request, response, function (err, res) {
          if (err) { // An error as occured
            util.error("> Error serving " + request.url + " - " + err.message);
            response.writeHead(err.status || 500, err.headers);
            response.end();
          } else { // The file was served successfully
            util.log("Serving " + request.url + " - " + res.message);
          }
        });

      });
    }

    if (credentials) {
      this.httpServer = https.createServer(credentials, connectionListener);
    } else {
      this.httpServer = http.createServer(connectionListener);
    }

    this.io = io.listen(this.httpServer);

		this.io.set('authorization', function (data, accept) {
			util.log("Inside CE authorization function");
			// check if there's a cookie header
			if (data.headers.cookie) {
				util.log("data.headers.cookie: " + data.headers.cookie);
				var c = data.headers.cookie.match(/_session_id=(\w*)\b/);
				if(c){
					var session_id = c[1];
					util.log("Found session_id: " + session_id );
					this.settings._ror_session_id = session_id;
				}else{
					util.log("No session_id was found"); 
					return accept('No session_id transmitted.', false);
				}
			} else {
				// if there isn't, turn down the connection with a message
				// and leave the function.
				return accept('No cookie transmitted.', false);
			}
			// accept the incoming connection
			accept(null, true);
		});

    this.io.sockets.on("connection", function(stream){ Connection.inst(stream) });

		// create a redis client to be used in subscribe AUTH
		_AUTH._redis_client = redis.createClient();
		_AUTH._redis_client.on("error", function (err) {
			console.log("_AUTH._redis_client connection error to " + _AUTH._redis_client.host + ":" + _AUTH._redis_client.port + " - " + err);
		});
		_AUTH._redis_client.auth(null);
  },

  listen: function(port){
    port = parseInt(port || process.env.PORT || 8080);
    this.httpServer.listen(port);
  }
});