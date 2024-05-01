const chatMessages = document.querySelector('.chat-messages');
const chatInput = document.querySelector('.chat-medispacy-input input');
const sendButton = document.querySelector('.chat-medispacy-input button');

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = chatInput.value.trim();
  if (message) {
    addMessageToChat('user', message);
    chatInput.value = '';
    const botResponse = getBotResponse(message);
    addMessageToChat('bot', botResponse);
  }
}

function addMessageToChat(sender, message) {
  send();
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  if (sender === 'bot') {
    messageElement.classList.add('bot-message');
  }
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function getBotResponse(message) {
  // Add your chatbot logic here
  return `You said: ${response}`;
}


function generateID() {
    var id = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < 32; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  
    return id;
  }
  
var conversation_id = generateID();
var response;

const userConversation = {
    event: "user_message",
    conversation: ["what is cancer"],
    key: "d5e899eb-741b-4749-ab48-ec161b1138f5",
    id: conversation_id,
    settings: {
      language: "English"
    }
  }

const ws = new WebSocket('wss://public.backend.medisearch.io:443/ws/medichat/api');

// Prepare for receiving the request
ws.onmessage = function incoming(data) {
    alert('kljbckvhb')
  const strData = data.data.toString();
  const jsonData = JSON.parse(strData);
  
  if (jsonData.event === "articles") {
      console.log("Got articles");
  } else if (jsonData.event === "llm_response") {
      console.log("Got llm response");
  } else if (jsonData.event === "error") {
      console.log("Got error");
  }
  response = jsonData.text;
  console.log(jsonData);
};


const send = () => {
    // WebSocket is open, time to send a request.
    alert('jvn')
    ws.onopen = function open() {
        alert('s;vnljvn')
    ws.send(JSON.stringify(userConversation));
}};