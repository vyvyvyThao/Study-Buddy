let socket = io();

let messagesDiv = document.getElementById("messages");
let messageInput = document.getElementById("messageInput");
let sendMessageButton = document.getElementById("sendMessage");
let chatIdString = window.location.pathname.split("/").pop();


fetch(`/chat-messages?chatId=${chatIdString}`).then((response) => {
  return response.json();
}).then((body) => {
  for( let messageObject of body.messages) {
    appendMessage(messageObject.chat_message)
  }
})

sendMessageButton.addEventListener("click", () => {
  let messageText = messageInput.value;
  if (messageText === "") {
    return;
  }
  socket.emit("send message", { message: messageText });
  appendMessage(messageText);
  messageInput.value = "";
});


function appendMessage(message) {
  let item = document.createElement("div");
  item.textContent = message;
  messagesDiv.appendChild(item);
  messages.scrollTo(0, messages.scrollHeight);
}

messageInput.addEventListener("keypress", (event) => {
  if (event.keyCode == 13) {
    event.preventDefault();
    sendMessageButton.click();
  }
});

socket.on('sent message', function ({message}) {
  appendMessage(message);
});