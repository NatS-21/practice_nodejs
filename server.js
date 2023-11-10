const fs = require("fs");
const WebSocket = require("ws");
const os = require("os");

const keywords = {
  dog: [
    "https://i.pinimg.com/originals/c7/99/13/c7991388722dae43d9dc931349e683ea.jpg",
    "https://s1.1zoom.ru/b5050/167/Dogs_Golden_Retriever_Glance_549674_1920x1200.jpg",
    "https://image.winudf.com/v2/image1/Y29tLmFuZHJvbW8uZGV2OTgwOC5hcHAyMjc4NzJfc2NyZWVuXzNfMTU2NzAwMDUxNF8wNjA/screen-3.jpg?fakeurl=1&type=.jpg",
  ],
  cat: [
    "https://wallbox.ru/resize/1600x1200/wallpapers/main/201237/koshki-99c5212a2c8c.jpg",
    "https://w.forfun.com/fetch/99/992ac857fb51fea944e3f4d388ef5477.jpeg",
    "https://mnogo-krolikov.ru/wp-content/uploads/2019/04/https-w-dog-ru-wallpapers-5-19-302971221769727-j-1024x768.jpeg",
  ],
  bear: [
    "https://wallbox.ru/resize/1024x768/wallpapers/main2/201731/15017517475982e9c33ddc07.02469156.jpg",
    "https://www.zastavki.com/pictures/1920x1200/2020Animals___Bears_Big_brown_bear_sits_in_tall_green_grass_143311_18.jpg",
    "https://images7.alphacoders.com/101/thumb-1920-1011058.jpg",
  ],
};

let MAX_CONCURRENT_THREADS = 1;
fs.readFile("config.txt", "utf8", function (err, data) {
  if (!err) {
    MAX_CONCURRENT_THREADS = Number(data);

    console.log(
      "Maximum number of concurrent threads set to ",
      MAX_CONCURRENT_THREADS
    );
  } else {
    console.error("Error reading configuration file config.txt:", err);
  }
});


const websocket_server = new WebSocket.Server({ port: 5090 });

function status(response) {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(new Error(response.statusText));
  }
}

function buffer(response) {
  return response.arrayBuffer();
}

function _arrayBufferToBase64(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

websocket_server.on("connection", (web_socket) => {
  console.log("Connection with client established");

  web_socket.on("message", (message) => {
    console.log(`New message received: ${message}`);

    try {
      const input_message = JSON.parse(message);

      let output_message = {
        REQUEST: input_message.REQUEST,
        DATA: input_message.DATA,
      };

      if (input_message.REQUEST == "KEYWORD") {
        output_message.ANSWER = keywords[input_message.DATA];
      } else if (input_message.REQUEST == "LINK") {
        fetch(input_message.DATA)
          .then(status)
          .then(buffer)
          .then(function (data) {
            output_message.ANSWER = _arrayBufferToBase64(data);

            web_socket.send(JSON.stringify(output_message));
          })
          .catch(function (error) {
            console.log("Query error!", error);
          });

        return;
      } else {
        output_message.ANSWER = "FAIL";
      }
      const urls = keywords[message];

      let threadCount = 0;

      if (threadCount < MAX_CONCURRENT_THREADS) {
        threadCount++;

        web_socket.send(JSON.stringify(output_message));

        console.log(
          `New thread started. (${threadCount} from ${MAX_CONCURRENT_THREADS})`
        );
      } else {
        console.log(
          "Maximum number of parallel threads reached!"
        );
      }
    } catch (err) {
      console.log(err);
    }
  });

  web_socket.on("close", () => {
    console.log("Connection with client disconnected!");
  });
});

console.log("WebSocket server running on port 5090");
console.log("Host name:", os.hostname());
