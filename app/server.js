const pg = require("pg");
const express = require("express");

const http = require("http");
const { Server } = require("socket.io");

let argon2 = require("argon2");
let cookieParser = require("cookie-parser");
let crypto = require("crypto");

const app = express();
let server = http.createServer(app);
let io = new Server(server);

let currUser;     // for logged in user's data

process.chdir(__dirname);
const path = require("path");

const port = 3000;
const hostname = "localhost";

const env = require("../env.json");
const { create } = require("domain");
const Pool = pg.Pool;
const pool = new Pool(env);

pool.connect().then(function () {
  console.log(`Connected to database ${env.database}`);
});

app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

/* -------------------------------------------------- */
// TO-DO: Only response to this request when user is authenticated
app.get("/notes", (req, res) => {
  // currUser is request sender and is authenticated
  pool.query(`SELECT * FROM notes WHERE user_id = $1`, [currUser.creatorId]).then(result => {
    console.log(result.rows);
    res.json({rows: result.rows});
  })
  .catch(error => {
    console.error("error:", error);
    res.status(500).json({error: "Something went wrong."});
  });
})

app.post("/notes/add", (req, res) => {
  let body = req.body;
  if (
    !body.hasOwnProperty("content") ||
    !body.hasOwnProperty("creatorId")
  ) {
    return res.status(404);
  }

  let creatorExist = true;
  pool.query(`SELECT user_id, username FROM users WHERE user_id = $1`, [creatorId])
  .then(result => {
    // console.log(result.rows);
    if (result.rows.length == 0) {
      creatorExist = false;
      res.status(400).json({error: 'user does not exist'});
    }
  })
    
  pool.query(
    `INSERT INTO notes(content, creator_id) 
    VALUES($1, $2)
    RETURNING *`,
    [body.content, body.creatorId],
  )
  .then((result) => {
    // console.log("Inserted:");
    // console.log(result.rows);
  })
  .catch((error) => {
    res.status(500);
  });
  res.send();
})

app.post("/task/add", (req, res) => {
  let body = req.body;
  if (
    !body.hasOwnProperty("title") ||
    !body.hasOwnProperty("due") ||
    !body.hasOwnProperty("progress") ||
    !body.hasOwnProperty("creatorId")
  ) {
    return res.status(404);
  }

  let title = body.title;
  let due = body.due;
  let progress = body.progress;  // done or not
  let creatorId = body.creatorId;

  let creatorExist = true;
  let today = new Date();
  let dueDate = new Date(due);

  // check if creator is an existent user
  pool.query(`SELECT user_id, username FROM users WHERE user_id = $1`, [creatorId])
      .then(result => {
        // console.log(result.rows);
        if (result.rows.length == 0) {
          creatorExist = false;
          res.status(400).json({error: 'user does not exist'});
        }
      })

  if (title.length < 1 || title.length > 50){
      res.status(400).json({error: 'invalid title'});
  
  } else if (today < dueDate) {
    res.status(400).json({error: 'invalid due date'});

  } else if (creatorExist) {
    pool
    .query(
      `INSERT INTO tasks(title, due, progress, creator_id) 
      VALUES($1, $2, $3, $4)
      RETURNING *`,
      [title, due, progress, creatorId],
    )
    .then((result) => {
      // console.log("Inserted:");
      // console.log(result.rows);
    })
    .catch((error) => {
      res.status(500);
    });
  }
  res.send();
});

app.post("friends/request", (req, res) => {
  let body = req.body;

  // TO-DO: Validations!!!

  pool.query(
    `INSERT INTO friend_requests(sender_id, user_id)
    VALUES($1, $2, $3)
    RETURNING *`,
    [body.sender_id, body.user_id],
  )
  .then((result) => {
    console.log("Success");
  })
  .catch((error) => {
    console.log(error);
    return res.status(500).send();
  })
});

app.post("friends/update", (req, res) => {
  let body = req.body;  // {sender_id, user_id, accept}

  // TO-DO: Validations!!!

  if (req.body.accept) {
    // add user with id sender_id to friends list of user with id user_id
  }

  pool.query(
    `DELETE FROM friend_requests WHERE sender_id = $1 AND user_id = $2`,
    [body.sender_id, body.user_id],
  )
  .then((result) => {
    console.log("Success");
  })
  .catch((error) => {
    console.log(error);
    return res.status(500).send();
  })
});

let cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
};

function makeToken() {
  // maybe increase the bytes for this, also increase the length to store password in db
  return crypto.randomBytes(18).toString("hex");
}

function validateLoginCredentials(body) {
  // TODO: move validation here
  return true;
}

app.post("/register", async (req, res) => {
  let body = req.body;
  //console.log(body);
  // TODO: Put the below validation in the function above
  if (
    !body.hasOwnProperty("username") ||
    !body.hasOwnProperty("email") ||
    !body.hasOwnProperty("password") ||
    !body.hasOwnProperty("timestamp")
  ) {
    return res.status(400).json({error: 'Bad Request'});
  }
  else {
    if (
      body["username"].length < 1 || body["username"].length > 20 ||
      body["password"].length < 7 || body["password"].length > 20 ||
      body["email"].length < 11 || body["email"].length > 255
    ) {
      // TODO: add more detail to the error message
      return res.status(400).json({error: 'Username, password must be below 20 characters'});
    }
  }

  let {username, email, password, timestamp} = body;
  console.log("IN SERVER: ", username, email, password, timestamp);
  
  pool.query(`SELECT username FROM users WHERE username = $1`, [username])
    .then(result => {
      // console.log(result.rows);
      if (result.rows.length !== 0) {
        return res.status(400).json({error: 'username already exists'});
      }
    });

  let hash;
  try {
    hash = await argon2.hash(password);
    console.log("HASH: ", hash);
  } catch (error) {
    console.log("hash failed", error);
    return res.sendStatus(500);
  }    
  console.log("HASH: ", hash);

  await pool.query(
    `INSERT INTO users(username, password, email, created_at)
    VALUES($1, $2, $3, $4)
    RETURNING *`,
    [username, hash, email, timestamp],
  )
  .then((result) => {
    console.log("Success");
  })
  .catch((error) => {
    console.log(error);
    return res.status(500).send();
  });
  // TODO: change the result body (look into automatic logging in after sign up)
  return res.sendStatus(200).send();
});

app.post("/login", async (req, res) => {
  let body = req.body;
  if (
    !body.hasOwnProperty("username") ||
    !body.hasOwnProperty("password") ||
    !body.hasOwnProperty("last_login")
  ) {
    return res.status(400).json({error: 'Bad Request'});
  }
  else {
    if (
      body["username"].length < 1 || body["username"].length > 20 ||
      body["password"].length < 7 || body["password"].length > 20
    ) {
      // TODO: add more detail to the error message
      return res.status(400).json({error: 'Username, password must be below 20 characters'});
    }
  }
  let {username, password, last_login} = body;
  console.log("IN SERVEr, login: ", username, password, last_login);

  let result;
  try {
    result = await pool.query(
      `SELECT * FROM users WHERE username = $1`, [username],
    );
  } catch (error) {
    console.log("error");
    res.sendStatus(500).json({error: error});
  }

  if (result.rows.length === 0) {
    res.sendStatus(400).json({error: "No user found"});
  }
  let hash = result.rows[0].password;
  let user_id = result.rows[0].user_id;
  console.log(username, password, hash);

  let verifyPassword;
  try {
    verifyPassword = await argon2.verify(hash, password);
  } catch (error) {
    console.log("FAILED PASSWORD VERIFICATION", error);
    res.sendStatus(500);
  }

  if (!verifyPassword) {
    console.log("Password doesn't match");
    res.sendStatus(400);
  }

  let token = makeToken();
  console.log("Generated token", token);
  pool.query(
    `INSERT INTO login_tokens(token, user_id)
    VALUES($1, $2)
    RETURNING *`,
    [token, user_id],
  ).catch((error) => {
    console.log(error);
    res.status(500).send();
  });
  // Updating current user with the logged in user
  currUser = {};
  currUser["creatorId"] = user_id;
  currUser["username"] = username;

  // TODO: check this again
  res.cookie("token", token, cookieOptions);
  console.log("redirect");
  //res.sendFile("/public/my-page.html", {root: __dirname});
  //res.status(200).redirect("/my-page/" + user_id);
  res.json({"url": "/my-page.html"});


});

// app.get("/my-page/:user_id", (req, res) => {
//   console.log("REDIRECTED!");
//   let file = path.join(__dirname, '/public', 'my-page.html');
//   console.log(file);
//   res.sendFile(file);
//   //return res.sendFile("/public/my-page.html", {root: __dirname});
// })

// to authorize the user
let authorize = (req, res, next) => {
  let { token } = req.cookies;
  console.log(token);
  let tokens;
  try {
    tokens = pool.query(
      `SELECT user_id FROM login_tokens WHERE token = $1`, [token],
    );
  } catch (error) {
    console.log("ERROR", error);
  }

  if (token === undefined || tokens.length === 0) {
    return res.sendStatus(403); // TODO
  }
  next();
};

// TODO: logout
// TODO: automatic user login after signup
// TODO: give private access to only authorized users

function invalidChatId(chatId) {
  return false;
}

app.get("/messages/:chatId", (req, res) => {
  let { chatId } = req.params;

  if (invalidChatId(chatId)) {
    return res.status(404).send();
  }

  res.sendFile("public/messages/index.html", { root: __dirname });
})

io.on("connection", (socket) => {
  console.log(`Socket ${socket.id} connected`);

  let url = socket.handshake.headers.referer;
  let pathParts = url.split("/");
  let chatId = pathParts[pathParts.length - 1];
  console.log(pathParts, chatId);

  // room doesn't exist - this should never happen, but jic
  if (invalidChatId(chatId)) {
    return;
  }
  socket.join(chatId);

  socket.on("disconnect", () => {
    // disconnects are normal; close tab, refresh, browser freezes inactive tab, ...
    // want to clean up global object, or else we'll have a memory leak
    // WARNING: sockets don't always send disconnect events
    // so you may want to periodically clean up your room object for old socket ids
    console.log(`Socket ${socket.id} disconnected`);
  });

  socket.on("send message", ({ message }) => {
    // we still have a reference to the roomId defined above
    // b/c this function is defined inside the outer function
    console.log(`Socket ${socket.id} sent message: ${message}, ${chatId}`);
    console.log("Broadcasting message to other sockets");

    // this would send the message to all other sockets
    // but we want to only send it to other sockets in this room
    // socket.broadcast.emit("message", message);
    socket.to(chatId).emit("sent message", message); 
  });
});

server.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});