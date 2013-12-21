suite('consumer', function() {
  var Consumer = require('./consumer'),
      Schema = require('./examples/schema'),
      Promise = require('promise');

  var QUEUE_NAME = Schema.queueNames()[0],
      EXCHANGE_NAME = Schema.exchangeNames()[0];

  var amqp = require('amqplib');

  // connect to amqp
  var connection;
  setup(function() {
    return amqp.connect().then(function(con) {con
      connection = con;
    });
  });

  var channel;
  setup(function() {
    return connection.createConfirmChannel().then(function(chan) {
      channel = chan;
    });
  });

  teardown(function() {
    return connection.close();
  });

  // define schema
  setup(function() {
    return Schema.define(connection);
  });

  // then tear it down
  teardown(function() {
    Schema.destroy(connection);
  });

  setup(function() {
    subject = new Consumer(connection);
  });

  test('#consume', function() {
    return subject.consume('my queue').then(
      function() {
        assert.ok(subject.consuming);
        assert.ok(subject.channel);
      }
    );
  });

  test('#close', function(done) {
    subject.consume().then(
      function() {
        subject.channel.once('close', done);
        subject.close();
      }
    );
  });

  suite('#read', function() {
    var object = { woot: true, a: [1, 2, 3] };
    var objectBuffer = new Buffer(JSON.stringify(object));

    function readQueueUntil(count, done) {
      channel.assertQueue(QUEUE_NAME).then(function(result) {
        if (result.messageCount === count) done();
      }, done);
    }

    test('ack', function(done) {
      subject.read = function(content, message) {
        return new Promise(function(accept, reject) {
          assert.deepEqual(content, object);
          accept();
          readQueueUntil(0, done);
        });
      };

      channel.publish(
        EXCHANGE_NAME,
        QUEUE_NAME,
        objectBuffer,
        { contentType: 'application/json' }
      );

      // being consuming records
      subject.consume(QUEUE_NAME);
    });
  });

});
