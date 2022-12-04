const {PubSub} = require('@google-cloud/pubsub');
const config = require('./config.json');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Creates a client; cache this for further use
const pubSubClient = new PubSub();

let keyId = 0;
let messageId = 0;
let lastNum = 0;

const pubSub = {
  listenForMessages: async (subscriptionNameOrId, CONTAINER) => {
    // References an existing subscription
    const subscription = pubSubClient.subscription(subscriptionNameOrId);

    // Create an event handler to handle messages
    const messageHandler = async message => {
      console.log('receiving data...');
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

        const fileKey = await pubSub.uploadFile();
        pubSub.postToKintone(result, fileKey);
        console.log('finished...');
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
  postToKintone: async (quote, fileKey) => {
    console.log('posting data...');
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
          author: {value: author},
          picture: {value: [{fileKey}]}
        }
      },
      headers
    );
  },
  uploadFile: async () => {
    const form = new FormData();
    let currentImageNumber = Math.floor(Math.random() * 30) + 1

    while (lastNum === currentImageNumber) {
      currentImageNumber = Math.floor(Math.random() * 30) + 1
    }

    lastNum = currentImageNumber;

    form.append('file', fs.readFileSync(`./spongebob/${currentImageNumber}.png`), `./spongebob/${currentImageNumber}.png`);
    
    const response = await axios.post(
        config.kintone_upload_file_url,
        form,
        {
            headers: {
                ...form.getHeaders(),
                "X-Cybozu-Authorization": config.user_token,
                "Content-Type": "multipart/form-data",
                "Accept-Encoding": null
            }
        }
    );

    return response.data.fileKey;
  }
};

module.exports = pubSub;

