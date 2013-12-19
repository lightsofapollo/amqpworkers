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
