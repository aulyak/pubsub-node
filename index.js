const pubSub = require('./pubSub');
const config = require('./config.json');

const CONTAINER = {
  message: undefined,
  key: undefined,
  messId: undefined,
  keyId: undefined,
  set setMessage(message) {
    this.message = message;
  },
  set setKey(key) {
    this.key = key;
  },
  set setMessId(messId) {
    this.messId = messId;
  },
  set setKeyId(keyId) {
    this.keyId = keyId;
  },
};

(async () => {
  const messagePromises = [
    pubSub.listenForMessages(config.message_subscriber_id, CONTAINER),
    pubSub.listenForMessages(config.key_subscriber_id, CONTAINER),
  ];

  await Promise.all(messagePromises);
})();