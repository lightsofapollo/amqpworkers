# AMQP Workers

[![Build Status](https://travis-ci.org/lightsofapollo/amqpworkers.png)](https://travis-ci.org/lightsofapollo/amqpworkers)

AMQP Workers is an opinioned library which codifies a lot of my personal
tastes while working with AMQP in JavaScript (node). It also embraces a
Promise _only_ api (everything should return a promise) and requires you
to setup / manage your own amqp connection (through [amqplib](https://npmjs.org/package/amqplib)).

The primary export is build out of four smaller modules (and while you
can use the top level export using the longer form is probably what you
want).

- [Schema](#schema)
- [Consumer](#consumer)
- [Publisher](#publisher)
- [Message](#message)


## Schema

A "Schema" is a blueprint to build all queues, exchanges and bindings
between them. Generally you always need to define a schema and its a
good idea to try to build it before publishing new messages or consuming
a queue. 

```js

// your_schema.js

var Schema = require('amqpworkers/schema');

module.exports = new Schema({
  // see examples/schema_config.json
});

```

Now that the schema is defined we can use it to define, purge and
destroy it. In RabbitMQ 3.2 and greater all are idempotent but deletes
will fail if the queue/exchange does not exist in earlier versions.

```js
// Define the schema

var AMQPSchema = require('./my_schema');

AMQPSchema.define(connection).then(
 //
);

// Destroy the schema (delete queues and exchanges)

AMQPSchema.destroy(connection).then(
 // messages and queues are gone! Good for testing
);

// Purge the messages but leave the exchanges, queues and bindings alone

AMQPSchema.purge(connection).then(
 // messages and queues are gone! Good for testing
);
```

## Consumer


## Publisher


## Message
