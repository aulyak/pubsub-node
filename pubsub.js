const {PubSub} = require('@google-cloud/pubsub');
const config = require('./config.json');
const axios = require('axios');

// Creates a client; cache this for further use
const pubSubClient = new PubSub();

let keyId = 0;
let messageId = 0;

const pubSub = {
  listenForMessages: async (subscriptionNameOrId, CONTAINER) => {
    // References an existing subscription
    const subscription = pubSubClient.subscription(subscriptionNameOrId);

    // Create an event handler to handle messages
    const messageHandler = async message => {
      messageCount += 1;

      // "Ack" (acknowledge receipt of) the message
      message.ack();
      const jsonMessage = JSON.parse(`${message.data}`);

      if (jsonMessage.hasOwnProperty('message')) {
        CONTAINER.setMessage = jsonMessage.message;
        messageId += 1;
      } else {
        CONTAINER.setKey = jsonMessage.key;
        keyId += 1;
      }

      CONTAINER.setKeyId = keyId;
      CONTAINER.setMessId = messageId;

      if (CONTAINER.keyId && CONTAINER.messId && CONTAINER.keyId === CONTAINER.messId) {
        const decryptedMessage = await pubSub.decryptMessage(CONTAINER.key, CONTAINER.message);
        const result = decryptedMessage.data.result;

        pubSub.postToKintone(result);
      }
    };

    subscription.on('message', messageHandler);
  },
  decryptMessage: async (key, message) => {
    console.log('decripting...');
    const headers = {
      headers: {
        Authorization: `Bearer ${config.bearer_token}`,
        "Accept-Encoding": null
      }
    };

    return axios.post(
      `${config.decrypt_url}${key}`,
      {message},
      headers
    );
  },
  postToKintone: async (quote) => {
    const {content, author} = {...quote};

    const headers = {
      headers: {
        "X-Cybozu-Authorization": config.user_token,
        "Content-Type": "application/json"
      }
    };

    return axios.post(
      config.kintone_add_record_url,
      {
        app: config.kintone_app_id,
        record: {
          quote: {value: content},
          author: {value: author}
        }
      },
      headers
    );
  }
};

module.exports = pubSub;

