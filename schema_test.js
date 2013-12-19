suite('amqp/schema', function() {
  var amqplib = require('amqplib');
  var schema = require('./schema');

  var connection;
  setup(function(done) {
    return amqplib.connect().then(function(_conn) {
      connection = _conn;
    });
  });

  test('do stuff', function() {
  });
});
