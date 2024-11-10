let messagesDiv = document.getElementById("messages");
let messageInput = document.getElementById("messageInput");
let sendMessageButton = document.getElementById("sendMessage");

sendMessageButton.addEventListener("click", () => {
  let messageText = messageInput.value;
  if (messageText === "") {
    return;
  }
  appendMessage(messageText);
  messageInput.value = "";
});


function appendMessage(message) {
  let item = document.createElement("div");
  item.textContent = message;
  messagesDiv.appendChild(item);
}

