// Dummy data for friends and friend requests
let friends = [{"username":"Alice"}, {"username":"Bob"}, {"username":"Charlie"}];
let friendRequests = ["David", "Eve"];
let chatHistory = {};

let socket = io();
let chatBox = document.getElementById("chat-box");
let userDetails;


function getChatId() {
    return window.location.pathname.split("/").pop();
}

function getChatMessages(chatIdString) {
    fetch(`/chat-messages?chatId=${chatIdString}`).then((response) => {
    return response.json();
    }).then((body) => {
        for( let messageObject of body.messages) {
            let messageText = messageObject.chat_message;
            let senderUsername = messageObject.sender_username;
            if (messageObject.sender_id === userDetails.user_id) {
                senderUsername = "You"
            }
            let element = createMessageElement(messageText, senderUsername);
            chatBox.appendChild(element);
            chatBox.scrollTo(0, chatBox.scrollHeight);
        }
    });
}

let input = document.getElementById("chat-message");
input.addEventListener("keypress", (event) => {
    if (event.keyCode == 13) {
        event.preventDefault();
        sendMessage();
    }
});

window.onload = function () {
    populateFriendList();
    populateFriendRequests();
    getUserData();
};

async function getUserData() {
    fetch(`/user`).then((response) => {
        return response.json();
    }).then((body) => {
        userDetails = body;
        usernameElement = document.getElementById("username");
        if (body.username !== undefined){
            usernameElement.innerText = body.username;
        }
    })
}

async function populateFriendList() {
    const friendsList = document.getElementById("friends-list");
    friendsList.innerHTML = "";
    try{
        friends = await fetch(`/friends/list`).then((response) => {
            return response.json();
        }).then((body) => {
            let temp = [];
            body.forEach((item) => {
                temp.push(item);
            })
            return temp
        })
    } catch {}

    friends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend.username;
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
    chatBox.innerHTML = `<h4>Chatting with ${friend.username}</h4>`;
    // if (!chatHistory[friend]) chatHistory[friend] = [];
    // chatHistory[friend].forEach(message => {
    //     const p = document.createElement("p");
    //     p.textContent = message;
    //     chatBox.appendChild(p);
    // });
    if (friend.chat_id) {
        history.pushState(".","", `/friends/${friend.chat_id}`)
        socket.emit("join", {"chatId": friend.chat_id})
        // window.location.href = `/friends/${friend.chat_id}`
        let chatIdString = getChatId();
        getChatMessages(chatIdString);
    } else {
        fetch(`/chat`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({"otherUserIds": [friend.friend_id]})
        }).then((response) => {
            return response.json();
        }).then((body) => {
            friend.chat_id = body.chatId;
            history.pushState(".", "", `/friends/${body.chatId}`)
            socket.emit("join", {"chatId": body.chatId})
            // window.location.href = `/friends/${body.chatId}`
            let chatIdString = getChatId();
            getChatMessages(chatIdString);
        }).catch()
    };

}

function sendMessage() {
    const chatBox = document.getElementById("chat-box");
    const input = document.getElementById("chat-message");
    const message = input.value;
    const friend = chatBox.querySelector("h4")?.textContent.split(" ")[2];
    if (friend && message) {
        if (!chatHistory[friend]) chatHistory[friend] = [];
        chatHistory[friend].push(`You: ${message}`);

        const element = createMessageElement(message, "You");
        chatBox.appendChild(element);
        chatBox.scrollTo(0, chatBox.scrollHeight);
        input.value = "";
        socket.emit("send message", {"message": message })
    } else {
        alert("Select a friend to chat with and enter a message!");
    }
}

function createMessageElement(message, sender) {
    let element = document.createElement("div");
    element.textContent = `${sender}: ${message}`;
    return element
}

socket.on('sent message', function ({message, sender}) {
    const chatBox = document.getElementById("chat-box");
    let element = createMessageElement(message, sender);
    chatBox.appendChild(element);
    chatBox.scrollTo(0, chatBox.scrollHeight);
});