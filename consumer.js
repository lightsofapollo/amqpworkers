var JSONMime = 'application/json';

var EventEmitter = require('events').EventEmitter,
    Promise = require('promise');


var debug = require('debug')('amqpworker:consume');

function binaryJSON(buffer) {
  return JSON.parse(buffer.toString('utf8'));
}

function channelOptions(channel, options) {
  // no-op
  if (!options.prefetch) return Promise.from(null);
  debug('prefetch', options.prefetch);
  return channel.prefetch(options.prefetch);
}

function Consumer(connection, reader) {
  // optionally passed reader
  if (reader) this.read = reader;

  this.connection = connection;
  EventEmitter.call(this);
}

Consumer.prototype = {
  __proto__: EventEmitter,

  constructor: Consumer,

  channel: null,

  connection: null,

  read: function(content, message) {
    return new Promise(function() {
      console.error('amqp/consumer .read method not overriden');
      throw new Error('.read must be overriden.');
    });
  },

  /**
  Default message parsing
  */
  parseMessage: function(message) {
    if (message.properties.contentType !== JSONMime) {
      debug('cannot parse', message.properties.contentType);
      return message.content;
    }

    return binaryJSON(message.content);
  },

  /**
  @type Boolean true when consuming a queue and false otherwise.
  */
  consuming: false,

  /**
  AMQP consumer tag... Generally only useful for canceling consumption.
  */
  consumerTag: null,

  /**
  Begin consuming queue.

  @param {String} queue name of the queue to consume from.
  @param {Object} [options]
  @param {Number} [options.prefetch] maximum concurrency of reads.
  @return Promise
  */
  consume: function(queue, options) {
    if (this.consuming) throw new Error('already consuming queue');
    debug('consume', queue);

    // initiate the consuming process
    this.consuming = true;

    return new Promise(function(accept, reject) {
      this.connection.createChannel().then(

        // assign the channel for later
        function (channel) {
          this.channel = channel;
        }.bind(this)

      ).then(

        // handle options
        function() {
          return channelOptions(this.channel, options);
        }.bind(this)

      ).then(

        // begin the consume
        function() {
          return this.channel.consume(
            queue, 
            this.handleConsume.bind(this)
          );
        }.bind(this)

      ).then(

        // save the consumer tag so we can cancel consumes
        function(consumeResult) {
          this.consumerTag = consumeResult.consumerTag;     
        }.bind(this)

      ).then(
        accept,
        reject
      );

    }.bind(this));
  },

  /**
  Handle the "raw" consume notification and transform it into a promise for ack/nack.
  */
  handleConsume: function(message) {
    if (!message) {
      return debug('no-op message', message);
    }

    // set the consumer flag from the message if its missing
    if (!this.consumerTag) this.consumerTag = message.fields.consumerTag;

    // parse the message
    var content = this.parseMessage(message);
    var channel = this.channel;

    // the magic! .read must return a promise.
    Promise.from(this.read(content, message)).then(
      function() {
        debug('ack', message.properties);
        // ack!
        channel.ack(message);
      },
      function(err) {
        debug('nack', message.properties, err);
        channel.nack(message);
      }
    );
  },

  /**
  Close the channel. Shortcut for channel.close.
  */
  close: function() {
    if (!this.consuming) return Promise.from(null);
    return this.channel.close().then(
      function() {
        this.consuming = false;
        this.channel = null;
      }.bind(this)
    );
  }
};

module.exports = Consumer;
