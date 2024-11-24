const pg = require("pg");
const express = require("express");

const http = require("http");
const { Server } = require("socket.io");

let argon2 = require("argon2");
let cookieParser = require("cookie-parser");
let crypto = require("crypto");
let cookie = require("cookie");

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
const { error } = require("console");
const Pool = pg.Pool;
const pool = new Pool(env);



pool.connect().then(function () {
  console.log(`Connected to database ${env.database}`);
});

app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());


app.use("*", (req, res, next) => {
  //middleware for debugging
  console.log({ url: req.originalUrl, body: req.body });
  next();
});

/* -------------------------------------------------- */

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
  // console.log("HASH: ", hash);

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
  return res.status(200).redirect("/login");
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
    return res.status(500).json({error: error});
  }

  if (result.rows.length === 0) {
    return res.status(400).json({error: "No user found"});
  }
  let hash = result.rows[0].password;
  let user_id = result.rows[0].user_id;
  console.log(username, password, hash);

  let verifyPassword;
  try {
    verifyPassword = await argon2.verify(hash, password);
  } catch (error) {
    console.log("FAILED PASSWORD VERIFICATION", error);
    return res.sendStatus(500);
  }

  if (!verifyPassword) {
    console.log("Password doesn't match");
    return res.sendStatus(400);
  }

  //DONE: if already logged in, do not generate another token before the earlier one expires
  // and set an expiry for it
  let existingTokens;
  let token;
  try {
    existingTokens = await pool.query(
      `SELECT * FROM login_tokens WHERE user_id = $1`, [user_id],
    );
    if (existingTokens.length === 0) {
      token = makeToken();
      console.log("Generated token", token);
      pool.query(
        `INSERT INTO login_tokens(token, user_id)
        VALUES($1, $2)
        RETURNING *`,
        [token, user_id],
      ).catch((error) => {
        console.log(error);
        return res.status(500).send();
      });
    } else {
      // console.log(existingTokens.rows);
      token = existingTokens.rows[0].token;
    }
  } catch (error) {
    console.log("ERROR", error);
  }
  
  // Updating current user with the logged in user
  currUser = {};
  currUser["user_id"] = user_id;
  currUser["username"] = username;

  // TODO: check this again
  res.cookie("token", token, cookieOptions);
  console.log("redirect");
  //res.sendFile("/public/my-page.html", {root: __dirname});
  //res.status(200).redirect("/my-page/" + user_id);
  return res.json({"url": "/my-page.html", "token": token});
});

// app.get("/my-page/:user_id", (req, res) => {
//   console.log("REDIRECTED!");
//   let file = path.join(__dirname, '/public', 'my-page.html');
//   console.log(file);
//   res.sendFile(file);
//   //return res.sendFile("/public/my-page.html", {root: __dirname});
// })

// to authorize the user
let authorize = async (req, res, next) => {
  let { token } = req.cookies;
  console.log(token);
  let tokens;
  try {
    tokens = await pool.query(
      `SELECT user_id FROM login_tokens WHERE token = $1`, [token],
    );
  } catch (error) {
    console.log("ERROR", error);
  }

  if (token === undefined || tokens.rows.length === 0) {
    return res.sendStatus(403); // TODO
  }

  res.locals.userId = tokens.rows[0].user_id
  next();
};

async function getUserId(token) {
  try {
    tokens = await pool.query(
      `SELECT user_id FROM login_tokens WHERE token = $1`, [token],
    );
  } catch (error) {
    console.log("ERROR", error);
  }
  return tokens.rows[0].user_id
}
// TODO: logout frontend in my-page
// TODO: automatic user login after signup
// TODO: put authorize middleware in other requests

app.post("/logout", (req, res) => {
  let { token } = req.cookies;

  if (token === undefined) {
    console.log("User already logged out");
    return res.status(400).json({error: "Already logged out"});
  }
  
  let tokens = pool.query(
    `SELECT user_id FROM login_tokens WHERE token = $1`, [token],
  );

  if(tokens.length === 0) {
    console.log("Token doesn't exist");
    return res.status(400).json({error: "Token doesn't exist"});
  }

  pool.query(
    `DELETE FROM login_tokens WHERE token = $1`, [token],
  );
  console.log("deleted token");

  return res.clearCookie("token", cookieOptions).send();

})

app.get("/notes", authorize, (req, res) => {
  pool.query(`SELECT * FROM notes WHERE creator_id = $1`, [currUser.user_id]).then(result => {
    console.log(result.rows);
    res.json({rows: result.rows});
  })
  .catch(error => {
    console.error("error:", error);
    res.status(500).json({error: "Something went wrong."});
  });
})

app.post("/notes/add", authorize, (req, res) => {
  let body = req.body;
  console.log("request user id:", req.body.creatorId);
  if (
    !body.hasOwnProperty("content") ||
    !body.hasOwnProperty("creatorId")
  ) {
    return res.status(404);
  }

  let creatorExist = true;
  pool.query(`SELECT user_id, username FROM users WHERE user_id = $1`, [body.creatorId])
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

app.get("/tasks", authorize, (req, res) => {
  pool.query(`SELECT * FROM tasks WHERE creator_id = $1`, [currUser.user_id]).then(result => {
    console.log(result.rows);
    res.json({rows: result.rows});
  })
  .catch(error => {
    console.error("error:", error);
    res.status(500).json({error: "Something went wrong."});
  });
})

app.post("/task/add", authorize, (req, res) => {
  let auth = req.headers["Authorization"];
  console.log(auth);

  let body = req.body;
  if (
    !body.hasOwnProperty("title") ||
    !body.hasOwnProperty("due") ||
    !body.hasOwnProperty("progress")
  ) {
    return res.status(404);
  }

  let title = body.title;
  let due = body.due;
  let progress = body.progress;  // done or not
  let creatorId = currUser.user_id;

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
  
  } else if (today > dueDate) {
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
  let body = req.body; // {user_id}

  if (currUser.user_id == body.user_id) {
    res.status(400).json({error: "Cannot send request to yourself."});
  }

  pool.query(`SELECT * FROM friend_requests WHERE sender_id = $1 AND user_id = $2`, [currUser.user_id, body.user_id]).then(result => {
    if (length(result.rows) != 0) {
      res.status(400).json({error: "Request has already been sent."});
    }
    res.json({rows: result.rows});
  })
  .catch(error => {
    console.error("error:", error);
  });  

  let user1_id = currUser.user_id;
  let user2_id = body.user_id
  if (currUser.user_id > body.user_id) {
    user1_id = body.user_id;
    user2_id = currUser.user_id;
  }

  pool.query(`SELECT * FROM friendships WHERE user1_id = $1 AND user2_id = $2`, [user1_id, user2_id]).then(result => {
    if (length(result.rows) != 0) {
      res.status(400).json({error: "2 users are already friends."});
    }
  })
  .catch(error => {
    console.error("error:", error);
  });  

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
  let body = req.body;  // {user_id, accept}

  if (currUser.user_id == body.user_id) {
    res.status(400).json({error: "Cannot make yourself a friends."});
  }

  let user1_id = currUser.user_id;
  let user2_id = body.user_id

  if (currUser.user_id > body.user_id) {
    user1_id = body.user_id;
    user2_id = currUser.user_id;
  }

  let friendshipList;

  pool.query(`SELECT * FROM friendships WHERE user1_id = $1 AND user2_id = $2`, [user1_id, user2_id])
  .then(result => {
    friendshipList = result.rows;
  })
  .catch(error => {
    console.error("error:", error);
  });  

  if (length(friendshipList) != 0) {
    // accepting friend request and friendship already exists => error
    if (req.body.accept) {
      res.status(400).json({error: "2 users are already friends."});
    
    // unfriend
    } else {
      pool.query(
        `DELETE FROM friendships WHERE user1_id = $1 AND user2_id = $2`,
        [user1_id, user2_id]
      )
      .then((result) => {
        res.status(204);
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).send();
      })
    }
  }

  // accept friend request if friendship does not exist
  if (req.body.accept) {
    pool.query(
      `INSERT INTO friendships(user1_id, user2_id)
      VALUES($1, $2)
      RETURNING *`,
      [user1_id, user2_id],
    )
    .then((result) => {
      res.status(201);
    })
    .catch((error) => {
      console.log(error);
      return res.status(500).send();
    })
  }

  // remove friend request
  pool.query(
    `DELETE FROM friend_requests WHERE sender_id = $1 AND user_id = $2`,
    [body.sender_id, body.user_id],
  )
  .catch((error) => {
    console.log(error);
    return res.status(500).send();
  })
});

// function makeToken() {
//   // maybe increase the bytes for this, also increase the length to store password in db
//   return crypto.randomBytes(18).toString("hex");
// }

// function validateLoginCredentials(body) {
//   // TODO: move validation here
//   return true;
// }

// app.post("/register", async (req, res) => {
//   let body = req.body;
//   //console.log(body);
//   // TODO: Put the below validation in the function above
//   if (
//     !body.hasOwnProperty("username") ||
//     !body.hasOwnProperty("email") ||
//     !body.hasOwnProperty("password") ||
//     !body.hasOwnProperty("timestamp")
//   ) {
//     return res.status(400).json({error: 'Bad Request'});
//   }
//   else {
//     if (
//       body["username"].length < 1 || body["username"].length > 20 ||
//       body["password"].length < 7 || body["password"].length > 20 ||
//       body["email"].length < 11 || body["email"].length > 255
//     ) {
//       // TODO: add more detail to the error message
//       return res.status(400).json({error: 'Username, password must be below 20 characters'});
//     }
//   }

//   let {username, email, password, timestamp} = body;
//   console.log("IN SERVER: ", username, email, password, timestamp);
  
//   pool.query(`SELECT username FROM users WHERE username = $1`, [username])
//     .then(result => {
//       // console.log(result.rows);
//       if (result.rows.length !== 0) {
//         return res.status(400).json({error: 'username already exists'});
//       }
//     });

//   let hash;
//   try {
//     hash = await argon2.hash(password);
//     console.log("HASH: ", hash);
//   } catch (error) {
//     console.log("hash failed", error);
//     return res.sendStatus(500);
//   }    
//   console.log("HASH: ", hash);

//   await pool.query(
//     `INSERT INTO users(username, password, email, created_at)
//     VALUES($1, $2, $3, $4)
//     RETURNING *`,
//     [username, hash, email, timestamp],
//   )
//   .then((result) => {
//     console.log("Success");
//   })
//   .catch((error) => {
//     console.log(error);
//     return res.status(500).send();
//   });
//   // TODO: change the result body (look into automatic logging in after sign up)
//   return res.sendStatus(200);
// });

// app.post("/login", async (req, res) => {
//   let body = req.body;
//   if (
//     !body.hasOwnProperty("username") ||
//     !body.hasOwnProperty("password") ||
//     !body.hasOwnProperty("last_login")
//   ) {
//     return res.status(400).json({error: 'Bad Request'});
//   }
//   else {
//     if (
//       body["username"].length < 1 || body["username"].length > 20 ||
//       body["password"].length < 7 || body["password"].length > 20
//     ) {
//       // TODO: add more detail to the error message
//       return res.status(400).json({error: 'Username, password must be below 20 characters'});
//     }
//   }
//   let {username, password, last_login} = body;
//   console.log("IN SERVEr, login: ", username, password, last_login);

//   let result;
//   try {
//     result = await pool.query(
//       `SELECT * FROM users WHERE username = $1`, [username],
//     );
//   } catch (error) {
//     console.log("error");
//     return res.status(500).json({error: error});
//   }

//   if (result.rows.length === 0) {
//     return res.status(400).json({error: "No user found"});
//   }
//   let hash = result.rows[0].password;
//   let user_id = result.rows[0].user_id;
//   console.log(username, password, hash);

//   let verifyPassword;
//   try {
//     verifyPassword = await argon2.verify(hash, password);
//   } catch (error) {
//     console.log("FAILED PASSWORD VERIFICATION", error);
//     return res.sendStatus(500);
//   }

//   if (!verifyPassword) {
//     console.log("Password doesn't match");
//     return res.sendStatus(400);
//   }

//   let token = makeToken();
//   console.log("Generated token", token);
//   pool.query(
//     `INSERT INTO login_tokens(token, user_id)
//     VALUES($1, $2)
//     RETURNING *`,
//     [token, user_id],
//   ).catch((error) => {
//     console.log(error);
//     return res.status(500).send();
//   });
//   // Updating current user with the logged in user
//   currUser = {};
//   currUser["user_id"] = user_id;
//   currUser["username"] = username;

//   // TODO: check this again
//   res.cookie("token", token, cookieOptions);
//   console.log("redirect");
//   //res.sendFile("/public/my-page.html", {root: __dirname});
//   //res.status(200).redirect("/my-page/" + user_id);
//   return res.json({"url": "/my-page.html", "token": token});
// });

// // app.get("/my-page/:user_id", (req, res) => {
// //   console.log("REDIRECTED!");
// //   let file = path.join(__dirname, '/public', 'my-page.html');
// //   console.log(file);
// //   res.sendFile(file);
// //   //return res.sendFile("/public/my-page.html", {root: __dirname});
// // })

// // TODO: automatic user login after signup
// // TODO: logout frontend + client side 
// // DONE: logout
// // DONE: put authorize middleware in other requests

// app.post("/logout", (req, res) => {
//   let { token } = req.cookies;

//   if (token === undefined) {
//     console.log("User already logged out");
//     return res.status(400).json({error: "Already logged out"});
//   }
  
//   let tokens = pool.query(
//     `SELECT user_id FROM login_tokens WHERE token = $1`, [token],
//   );

//   if(tokens.length === 0) {
//     console.log("Token doesn't exist");
//     return res.status(400).json({error: "Token doesn't exist"});
//   }

//   pool.query(
//     `DELETE FROM login_tokens WHERE token = $1`, [token],
//   );
//   console.log("deleted token");

//   return res.clearCookie("token", cookieOptions).send();

// })

function invalidChatId(chatId) {
  return false;
}



app.post("/chat", authorize, (req, res) => {  
  let body = req.body;
  if (!body.hasOwnProperty("otherUserIds")) {
    return res.sendStatus(400);
  }

  if (!Array.isArray(body["otherUserIds"])) {
    return res.sendStatus(400);
  }

  if (body["otherUserIds"].length != 1) {
    return res.sendStatus(400);
  }
  
  let users;
  pool.query("SELECT * FROM users WHERE user_id IN $1", [otherUserIds]).then(result => {
    users = result.rows
  }).catch((error)=> {
    console.log(error);
    return res.sendStatus(500);
  })

  if (body["otherUserIds"].length != users.length) {
    return res.sendStatus(400);
  }

  let newChatId;
  pool.query("INSERT INTO chat VALUES(NULL) RETURNING *").then((result) => {
    newChatId = result.rows.chat_id
  }).catch((error)=> {
    console.log(error);
    return res.sendStatus(500);
  })

  values = []
  values.push([newChatId, res.locals.userId])
  for(let userId of body["otherUserIds"]) {
    values.append([newChatId, userId])
  }
  
  pool.query("INSERT INTO chat_user(chat_id, user_id) VALUES $1", values).then(result => {
    
  })

  return res.status(200).json({"chatId": newChatId});
})

app.get("/messages/:chatId", (req, res) => {
  let { chatId } = req.params;

  if (invalidChatId(chatId)) {
    return res.status(404).send();
  }

  return res.sendFile("public/messages/index.html", { root: __dirname });
})

app.get("/chat-messages", (req, res) => {
  let { chatId } = req.query;
  if (invalidChatId(chatId)) {
    return;
  }
  
  pool.query(
    "SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY sent_date", 
    [chatId]
  ).then((result) => {
    return res.status(200).json({messages: result.rows})
  }).catch((error) => {
    console.log(error)
  })
}) 

io.on("connection", async (socket) => {
  console.log(`Socket ${socket.id} connected`);

  let url = socket.handshake.headers.referer;
  let pathParts = url.split("/");
  let chatId = pathParts[pathParts.length - 1];


  let cookies = cookie.parse(socket.handshake.headers.cookie);
  try {
    socket.data.userId = await getUserId(cookies.token);
  } catch {
    socket.disconnect();
  }
  
  if (invalidChatId(chatId)) {
    return;
  }
  socket.join(chatId);

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
  });

  socket.on("send message", ({ message }) => {
    pool.query(
      "INSERT INTO chat_messages(chat_id, chat_message, sent_date) VALUES($1, $2, $3) RETURNING *",
      [chatId, message, new Date(new Date().toISOString())]
    ).then((result) => {
    }).catch(error => {
      console.log(error);
    })
    socket.to(chatId).emit("sent message", {"message": message});
  });
});

server.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});