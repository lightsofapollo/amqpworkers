var Promise = require('promise');

function publishPending(exchange, route, message) {
  var channelPromise = this.openChannel();

  // individual promise for each pending publish
  return new Promise(function(accept, reject) {
    channelPromise.then(
      // wait for the channel open
      function () {
        return publishReady.call(
          this,
          exchange,
          route,
          message
        );
      }.bind(this)
    ).then(
      accept,
      reject
    );
  }.bind(this));
}

function publishReady(exchange, route, message) {
  return this.channel.publish(
    exchange,
    route,
    message.buffer,
    message.options
  );
}

function Publisher(connection) {
  this.connection = connection;
}

Publisher.prototype = {
  channel: null,
  connection: null,

  /**
  Begin opening the channel for publishing.

  @private
  @return {Promise} will return the same promise every time.
  */
  openChannel: function() {
    if (this.channel) throw new Error('.channel is already open');
    if (this.channelPromise) return this.channelPromise;

    this.channelPromise = this.connection.createConfirmChannel();

    return this.channelPromise.then(
      function(channel) {
        // after the channel is open the first step is to remove the promise
        this.channelPromise = null;

        // then we need to switch publish to publishReady. Previous calls to
        // publish pending will be handled in their scope.
        this.publish = publishReady;

        // now we are ready to publish stuff on the channel!
        this.channel = channel;
      }.bind(this)
    );
  },

  publish: publishPending,

  close: function() {
    if (!this.channel) return Promise.from(null);
    return this.channel.close().then(
      function() {
        this.channel = null;
      }.bind(this)
    );
  }
};

module.exports = Publisher;
