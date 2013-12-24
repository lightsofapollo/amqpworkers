suite('publisher', function() {
  var Consumer = require('./consumer'),
      Publisher = require('./publisher'),
      Message = require('./message'),
      Schema = require('./examples/schema');

  var EXCHANGE = Schema.exchangeNames()[0],
      QUEUE = Schema.queueNames()[0];

  var amqp = require('amqplib');

  var connection;
  setup(function() {
    return amqp.connect().then(function(con) {
      connection = con;
    });
  });

  setup(function() {
    return Schema.define(connection);
  });

  teardown(function() {
    return Schema.destroy(connection);
  });

  teardown(function() {
    return connection.close();
  });

  var subject;
  setup(function() {
    subject = new Publisher(connection);
  });

  suite('#publish', function() {
    var object = { wooot: true };
    var published = new Message(
      object,
      { messageId: 'custom' }
    );

    setup(function(done) {
      // publish should be a promise!
      return subject.publish(
        EXCHANGE,
        QUEUE,
        published
      );
    });

    test('consume message', function(done) {
      var consume = new Consumer(connection, function(content, message) {
        // verify round trip encoding
        assert.deepEqual(content, object);

        // verify we pass options
        assert.equal(
          published.options.messageId,
          message.properties.messageId
        );

        done();
      });

      consume.consume(QUEUE);
    });
  });
});
