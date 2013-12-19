# AMQP Abstraction / Tasks

amqplib is great for low level bits of amqp but generally what I want
is a simple way of creating queues [1], consuming queues [2] and
publishing events [3]. Some other projects like celery (python) use an
abstraction layer that hides the amqp queues, exchanges and routing
keys. What I want is something that embraces amqp and allows for
interoperability with other amqp providers which know nothing of the
framework.

Code drafts:

### [1] creating schema
```js
// queue creation is like a schema. Generally operations are idempontent 

var Schema = require('amqp-schema');

module.exports = Schema.create({
  // by default exchanges are direct
  exchanges: {
    'tasks': { type: 'direct' }
  },
  queues: {
    'request': {
      durable: true,
      bind: [
        { source: 'tasks', pattern: 'request' }
      ]
    },
    response: {
      bind: [
        { source: 'tasks', pattern: 'response' }
      ]
    }
  }
});
```

```js
// use schema

// each operation is run in its own channel to isolate errors down
// to the schema creation... generally these should be run first.

var TaskSchema = require('task_schema');
TaskSchema.create(connection).then(function() {
  // the magic happens
});

// destroy the schema
TaskSchema.destroy(connection);

// purge all records
TaskSchema.purge(connection);
```

## Consuming Queues [2]

Generally my intended usecase for consuming a queue is a "worker"
which consumes one or more queues but little else... Ideally some 
other dedicated cluster (or even a single server) is responsible for
adding work to the queue.

Important activities for the worker are:

1. Marking work as complete (ack)
2. Marking work as incomplete or some other error (nack)
3. Parsing the payload of the message (json, bson, etc...)


```js
var Consumer = require('amqp/consumer');

Consumer.prototype.parsers = {
  'application/json': function() {
     // parse json buffer
   },

   'bson': function() {},
   'msgpack': function() {}
};

var TaskConsumer = Consumer.create({
  queue: 'request',

  read: function(content, message) {
    return new Promise(function(
      accept, // ack
      reject // nack
    ) {
      
    });
  }
});


var tasks = new TaskConsumer(connection, {
  // concurrency of 1
  prefetch: 1
});

tasks.on('error', '...');

```
## Publishing to exchanges [3]

The primary intended use for this framework is a worker queue model as
such we need to publish in a way that gives us the best possible
guarantee of delivery. Rabbit has [confirm](http://www.rabbitmq.com/confirms.html) channels just for this
usecase.

```js
var Exchange = require('amqp/exchange');
var Message = require('amqp/message');

Message.prototype.encoders = {
  'application/json': function() {}
};

var JSONMessage = Message.create({
  contentType: 'application/json',
  persistent: true
});

function TaskExchange() {
  Exchange.apply(this, arguments);
}

TaskExchange.prototype = {
  __proto__: Exchange.prototype,

  request: function(task) {
    return this.publish('request', new JSONMessage(task));
  },

  response: function(result) {
    return this.publish('response', new JSONMessage(result));
  }
}

var exchange = new TaskExchange(connection, 'exchangeName');

exchange.request({ task: 'woot' }).then(
  function() { /* ack */ },
  function() { /* nack */ }
);

exchange.response({ task: 'woot' }).then(
  function() { /* ack */ },
  function() { /* nack */ }
);

exchange.on('error', function() {
  // channel error
});
```
