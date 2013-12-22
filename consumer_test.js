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
    return Schema.define(connection).then(
      function() {
        // ensure a clean state each test run
        return Schema.purge(connection);
      }
    );
  });

  // then tear it down
  teardown(function() {
    Schema.destroy(connection);
  });

  setup(function() {
    subject = new Consumer(connection);
  });

  function publish(object) {
    // test helper for publish
    return channel.publish(
      EXCHANGE_NAME,
      QUEUE_NAME,
      new Buffer(JSON.stringify(object)),
      { contentType: 'application/json' }
    );
  }

  // helper which verifies we ack (or nack)
  function readQueueUntil(count, done) {
    channel.assertQueue(QUEUE_NAME).then(function(result) {
      if (result.messageCount === count) done();
    }, done);
  }

  test('#consume', function() {
    return subject.consume(QUEUE_NAME).then(
      function() {
        assert.ok(subject.consumerTag);
        assert.ok(subject.consuming);
        assert.ok(subject.channel);
      }
    );
  });

  test('#close', function(done) {
    subject.consume(QUEUE_NAME).then(
      function() {
        subject.channel.once('close', done);
        subject.close();
      }
    );
  });

  suite('#read', function() {
    test('ack', function(done) {
      var object = { xfoo: true };

      subject.read = function(content, message) {
        return new Promise(function(accept, reject) {
          assert.deepEqual(content, object);
          accept();
          readQueueUntil(0, done);
        });
      };

      // push object into queue
      publish(object);

      // being consuming records
      subject.consume(QUEUE_NAME);
    });

    test('nack', function(done) {
      var ignore = false;
      subject.read = function(content, message) {
        return new Promise(function(accept, reject) {
          if (ignore) return;

          // run this only once
          ignore = true;

          // reject the message
          reject();

          // signal the cancellation of consumer
          subject.channel.cancel(subject.consumerTag).then(
            function() {
              readQueueUntil(1, done); 
            }
          );
        });
      };

      publish({ nackME: true });

      subject.consume(QUEUE_NAME);
    });
  });
});
