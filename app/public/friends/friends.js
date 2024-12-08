// Dummy data for friends and friend requests
let friends = [{"username":"Alice"}, {"username":"Bob"}, {"username":"Charlie"}];
let friendRequests = ["David", "Eve"];
let chatHistory = {};

let socket = io();
let chatBox = document.getElementById("chat-box");
let userDetails;
let chats;

function getChatId() {
    return window.location.pathname.split("/").pop();
}

async function loadChats() {
    return await fetch(`/chat`).then((response) => {
        return response.json();
    }).then((body) => {
        let chats = {}
        for( let chatObject of body) {
            chats[chatObject.friend_id] = chatObject; 
        }
        return chats;
    }).catch();
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

window.onload = async function () {
    populateFriendList();
    populateFriendRequests();
    getUserData();
    chats = await loadChats();
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
                console.log(item);
                if (item.user_accepted && item.friend_accepted) {
                    temp.push(item);
                }
            })
            return temp
        })
    } catch {}
    let chatId = getChatId();

    friends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend.username;
        li.onclick = () => selectFriend(friend);
        friendsList.appendChild(li);
        if (chatId && chatId === friend.chat_id.toString()){
            selectFriend(friend);
        }
    });
}

async function populateFriendRequests() {
    const requestsList = document.getElementById("friend-requests");
    requestsList.innerHTML = "";

    try{
        friendRequests = await fetch(`/friends/list`).then((response) => {
            return response.json();
        }).then((body) => {
            let temp = [];
            body.forEach((item) => {
                console.log(item);
                if (!item.user_accepted && item.friend_accepted) {
                    temp.push(item);
                }
            })
            return temp
        })
    } catch {}

    friendRequests.forEach(request => {
        console.log(request);
        const li = document.createElement("li");
        li.textContent = request.username;
        const acceptButton = document.createElement("button");
        acceptButton.textContent = "Accept";
        acceptButton.onclick = () => acceptFriendRequest(request.username);
        li.appendChild(acceptButton);
        requestsList.appendChild(li);
    });
}

function sendFriendRequest() {
    const username = document.getElementById("friend-username").value;

    if (username) {
        fetch("request", {
            method: "POST",

            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        
            body: JSON.stringify({
                friend_username: username
            })
        })
        
        .then(response => {
            return response.body;
        }).then(body => {
            console.log(body);
        }).catch(error => {
            console.log(error);
        });
        console.log("Sent request POST /friends/request");
        alert(`Friend request sent to ${username}`);

        document.getElementById("friend-username").value = "";
    }
}

function acceptFriendRequest(username) {
    // friends.push(username);
    // friendRequests.splice(friendRequests.indexOf(username), 1);
    console.log("Changing pending status for", username);

    if (username) {
        fetch("accept", {
            method: "PATCH",

            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        
            body: JSON.stringify({
                friend_username: username
            })
        })
        
        .then(response => {
            return response.body;
        }).then(body => {
            console.log(body);
        }).catch(error => {
            console.log(error);
        });

        document.getElementById("friend-username").value = "";
    }

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
    if (chats[friend.friend_id] && chats[friend.friend_id].chat_id) {
        history.pushState(".","", `/friends/${chats[friend.friend_id].chat_id}`)
        socket.emit("join", {"chatId": chats[friend.friend_id].chat_id})
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

socket.on('sent message', function ({message, sender_username}) {
    const chatBox = document.getElementById("chat-box");
    let element = createMessageElement(message, sender_username);
    chatBox.appendChild(element);
    chatBox.scrollTo(0, chatBox.scrollHeight);
});