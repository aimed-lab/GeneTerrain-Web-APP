function generateID() {
    var id = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < 32; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  
    return id;
  }
  
var conversation_id = generateID();

const userConversation = {
    event: "user_message",
    conversation: ["what is cancer"],
    key: "d5e899eb-741b-4749-ab48-ec161b1138f5",
    id: conversation_id,
    settings: {
      language: "English"
    }
  }

const ws = new WebSocket('wss://public.backend.medisearch.io:443/ws/medichat/api') as WebSocket;

// Prepare for receiving the request
ws.onmessage = function incoming(data) {
  const strData = data.data.toString();
  const jsonData = JSON.parse(strData);
  
  if (jsonData.event === "articles") {
      console.log("Got articles");
  } else if (jsonData.event === "llm_response") {
      console.log("Got llm response");
  } else if (jsonData.event === "error") {
      console.log("Got error");
  }
  console.log(jsonData);
};


export const send = () => {
    // WebSocket is open, time to send a request.
    ws.onopen = function open() {
    ws.send(JSON.stringify(userConversation));
}};