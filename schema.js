var Promise = require('then');

// map objects into a parallel set of promises.
function mapThenThunk(array, handler) {
  return function() {
    return Promise.all(array.map(handler));
  };
}

function Schema(schema) {
  this.exchanges = schema.exchanges;
  this.queues = schema.queues;
  this.binds = schema.binds;
}

Schema.prototype = {
  exchanges: null,
  queues: null,
  binds: null,

  define: function(connection) {
    return new Promise(function(accept, reject) {
      var channel;

      var promise = connection.createChannel();

      // directly tie in the channel error to this promise.
      promise.then(
        function(_chan) { 
          channel = _chan;
          channel.once('error', reject);
        }
      );

      if (this.exchanges) {
        promise.then(
          mapThenThunk(this.exchanges, function() {
            return channel.assertExchange.apply(channel, arguments);
          })
        );
      }

      if (this.queues) {
        promise.then(
          mapThenThunk(this.queues, function() {
            return channel.assertQueue.apply(channel, arguments);
          })
        );
      }

      if (this.binds) {
        promise.then(
          mapThenThunk(this.binds, function() {
            return channel.bindQueue.apply(channel, arguments);
          })
        );
      }

      // once our binds are complete we can close the channel.
      promise.then(
        function() {
          return channel.close();
        } 
      );

      promise.then(accept, reject);
    });
  },

  destroy: function(connection) {
  },

  purge: function(connection) {
  }
};


module.exports = Schema;
