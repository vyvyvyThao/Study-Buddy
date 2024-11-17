// Dummy data for friends and friend requests
const friends = ["Alice", "Bob", "Charlie"];
const friendRequests = ["David", "Eve"];
let chatHistory = {};

window.onload = function () {
    populateFriendList();
    populateFriendRequests();
};

function populateFriendList() {
    const friendsList = document.getElementById("friends-list");
    friendsList.innerHTML = "";
    friends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        li.onclick = () => selectFriend(friend);
        friendsList.appendChild(li);
    });
}

function populateFriendRequests() {
    const requestsList = document.getElementById("friend-requests");
    requestsList.innerHTML = "";
    friendRequests.forEach(request => {
        const li = document.createElement("li");
        li.textContent = request;
        const acceptButton = document.createElement("button");
        acceptButton.textContent = "Accept";
        acceptButton.onclick = () => acceptFriendRequest(request);
        li.appendChild(acceptButton);
        requestsList.appendChild(li);
    });
}

function sendFriendRequest() {
    const username = document.getElementById("friend-username").value;
    if (username) {
        alert(`Friend request sent to ${username}`);
        document.getElementById("friend-username").value = "";
    }
}

function acceptFriendRequest(username) {
    friends.push(username);
    friendRequests.splice(friendRequests.indexOf(username), 1);
    populateFriendList();
    populateFriendRequests();
}

function selectFriend(friend) {
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = `<h4>Chatting with ${friend}</h4>`;
    if (!chatHistory[friend]) chatHistory[friend] = [];
    chatHistory[friend].forEach(message => {
        const p = document.createElement("p");
        p.textContent = message;
        chatBox.appendChild(p);
    });
}

function sendMessage() {
    const chatBox = document.getElementById("chat-box");
    const input = document.getElementById("chat-message");
    const message = input.value;
    const friend = chatBox.querySelector("h4")?.textContent.split(" ")[2];
    if (friend && message) {
        const p = document.createElement("p");
        p.textContent = `You: ${message}`;
        chatBox.appendChild(p);
        if (!chatHistory[friend]) chatHistory[friend] = [];
        chatHistory[friend].push(`You: ${message}`);
        input.value = "";
    } else {
        alert("Select a friend to chat with and enter a message!");
    }
}
