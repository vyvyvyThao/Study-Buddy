let express = require("express");
let { Pool } = require("pg");

// make this script's dir the cwd
// b/c npm run start doesn't cd into src/ to run this
// and if we aren't in its cwd, all relative paths will break
process.chdir(__dirname);

let port = 3000;
let host;
let databaseConfig;
// fly.io sets NODE_ENV to production automatically, otherwise it's unset when running locally
if (process.env.NODE_ENV == "production") {
	host = "0.0.0.0";
	databaseConfig = { connectionString: process.env.DATABASE_URL };
} else {
	host = "localhost";
	let { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT } = process.env;
	databaseConfig = { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT };
}

let app = express();
app.use(express.json());
app.use(express.static("public"));

// uncomment these to debug
// console.log(JSON.stringify(process.env, null, 2));
// console.log(JSON.stringify(databaseConfig, null, 2));

let pool = new Pool(databaseConfig);
pool.connect().then(() => {
	console.log("Connected to db");
});

/*
KEEP EVERYTHING ABOVE HERE
REPLACE THE FOLLOWING WITH YOUR SERVER CODE 
*/

// const pg = require("pg");
// const express = require("express");

const http = require("http");
const { Server } = require("socket.io");

let argon2 = require("argon2");
let cookieParser = require("cookie-parser");
let crypto = require("crypto");
let cookie = require("cookie");

let server = http.createServer(app);
let io = new Server(server);

let currUser;     // for logged in user's data

process.chdir(__dirname);
// const path = require("path");

// const hostname = "localhost";

// const env = require("../env.json");
// const { create } = require("domain");
// const { error } = require("console");
// const { console } = require("inspector");
// const Pool = pg.Pool;
// const pool = new Pool(env);



// pool.connect().then(function () {
//   console.log(`Connected to database ${env.database}`);
// });

// app.use(express.static("public"));
// app.use(express.json());
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
  // maybe increase the bytes for this, also increase the length to store password in db - done
  return crypto.randomBytes(18).toString("hex");
}


app.post("/register", async (req, res) => {
  let body = req.body;
  //console.log(body);
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
    return res.status(500);
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
    return res.status(500);
  });
  // DONE: change the result body (look into automatic logging in after sign up)
  return res.status(200).json();
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
  // and did not set an expiry for it
  let existingTokens;
  let token;
  try {
    existingTokens = await pool.query(
      `SELECT * FROM login_tokens WHERE user_id = $1`, [user_id],
    );
    if (existingTokens.rows.length === 0) {
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
  return res.json({"url": "/my-page", "token": token, "username": username});
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

async function getUserDetails(userId) {
  try {
    result = await pool.query(
      `SELECT username, user_id FROM users WHERE user_id = $1`, [userId],
    );
  } catch (error) {
    console.log("ERROR", error);
  }
  return result.rows[0]
}

app.get("/user", authorize, async (req, res) => {
  let userDetails
  try {
    userDetails = await getUserDetails(res.locals.userId)
  } catch (error) {
    console.log(error);
    return;
  }
  return res.status(200).json(userDetails)
})

// DONE: logout frontend in my-page
// DONE: automatic user login after signup
// DOING: put authorize middleware in other requests

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

  return res.clearCookie("token", cookieOptions).json({"url": "/index.html"});

})

// app.get("/:username/my-page", authorize, (req, res) => {
//   // return res.sendFile("public/my-page.html", { root: __dirname });
//    return res.json({"url": "/my-page.html"});
// })

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

  if (!body.hasOwnProperty("content")) {
    return res.status(404);
  }
    
  pool.query(
    `INSERT INTO notes(content, creator_id) 
    VALUES($1, $2)
    RETURNING *`,
    [body.content, currUser.user_id],
  )
  .then((result) => {
    console.log("Inserted:");
    console.log(result.rows);
  })
  .catch((error) => {
    res.status(500);
  });
  res.send();
})

app.get("/my-page/tasks", authorize, (req, res) => {
  pool.query(`SELECT * FROM tasks WHERE creator_id = $1`, [res.locals.userId]).then(result => {
    console.log(result.rows);
    res.json({rows: result.rows});
  })
  .catch(error => {
    console.error("error:", error);
    res.status(500).json({error: "Something went wrong."});
  });
})

app.post("/my-page/task/add", authorize, (req, res) => {
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
  let progress = body.progress;
  let creatorId = res.locals.userId;

  console.log("Read in: ", title, due);

  let creatorExist = true;
  let today = new Date();
  let dueDate = new Date(due);

  pool.query(`SELECT user_id, username FROM users WHERE user_id = $1`, [creatorId])
      .then(result => {
        console.log(result.rows);
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
      on conflict do nothing
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

app.patch("/my-page/task/update", authorize, (req, res) => {
  console.log("Updating task");
  let body = req.body;

  pool.query(`
    UPDATE tasks
    SET progress = $1
    WHERE title = $2`, [body.progress, body.title])
  .then((results) => {
    console.log(results.rows);
    return res.status(200).json(results.rows)
  }).catch(error => {
    console.log(error);
  });
})

app.post("/friends/request", authorize, (req, res) => {
  let body = req.body;
  let username = body.friend_username;
  let friend_id;

  pool.query(`SELECT user_id FROM users WHERE username = $1`, [username])
      .then(result => {
        console.log(result.rows);
        if (result.rows.length == 0) {
          denied = true;
          res.status(400).json({error: 'user does not exist'});
        } else {
          console.log("Getting id: ", result.rows[0].user_id);
          friend_id = result.rows[0].user_id;
          
          if (currUser.user_id == friend_id) {
            res.status(400).json({error: "Cannot send request to yourself."});

          } else {
            let user1_id = currUser.user_id;
            let user1_accepted = true;
            let user2_id = friend_id;
            let user2_accepted = false;
            
            if (currUser.user_id > friend_id) {
              user1_id = friend_id;
              user1_accepted = false;
              user2_id = currUser.user_id;
              user2_accepted = true;
            }

            pool.query(
              `INSERT INTO friendships(user1_id, user2_id, user1_accepted, user2_accepted)
              VALUES($1, $2, $3, $4)
              on conflict do nothing
              RETURNING *`,
              [user1_id, user2_id, user1_accepted, user2_accepted],
            )
            .then((result) => {
            })
            .catch((error) => {
              console.log(error);
              return res.status(500).send();
            })
          }
        }
      })

});

app.get("/friends/list", authorize, async (req, res) => {
  let userId =  res.locals.userId;
  pool.query(
    `SELECT friend_id, friend_accepted, user_accepted, username FROM
    (SELECT user2_id as friend_id, user2_accepted as friend_accepted, user1_accepted as user_accepted FROM friendships WHERE user1_id = $1 
    UNION SELECT user1_id as friend_id, user1_accepted as friend_accepted, user2_accepted as user_accepted FROM friendships WHERE user2_id = $1) AS t1
    LEFT JOIN users ON t1.friend_id=users.user_id`
    , [userId]
  ).then((results) => {
    return res.status(200).json(results.rows)
  }).catch(error => {
    console.log(error);
    return res.sendStatus(500);
  });
});

app.patch("/friends/accept", authorize, (req, res) => {
  console.log("receving request");
  let body = req.body; 
  let friend_id;

  pool.query(`SELECT user_id FROM users WHERE username = $1`, [body.friend_username])
  .then(result => {
    console.log(result.rows);
    if (result.rows.length == 0) {
      res.status(404).json({error: 'user does not exist'});

    } else {
      console.log("Getting id: ", result.rows[0].user_id);
      friend_id = result.rows[0].user_id;
      console.log(friend_id);

      if (currUser.user_id == friend_id) {
        res.status(400).json({error: "Cannot make yourself a friends."});
      }

      else {
        let user1_id = currUser.user_id;
        let user2_id = friend_id;
  
        if (currUser.user_id > friend_id) {
          user1_id = friend_id;
          user2_id = currUser.user_id;
        }
  
        pool.query(`
          UPDATE friendships
          SET user1_accepted = true, user2_accepted = true
          WHERE user1_id = $1 AND user2_id = $2`, [user1_id, user2_id])
        .then((results) => {
          console.log(results.rows);
          return res.status(200).json(results.rows)
        }).catch(error => {
          console.log(error);
        });
      }
    }
  })
});

function getSessionMembers(group_id) {
  pool.query(`SELECT u.username, u.user_id 
    FROM group_memberships g JOIN users u ON g.user_id = u.user_id 
    WHERE g.group_id = $1`, [group_id]).then(result => {
    // console.log(result.rows);
    return result.rows;
  })
  .catch(error => {
    console.error("error:", error);
    res.status(500).json({error: "Something went wrong."});
  });
}

app.get("/session", authorize, (req, res) => {
  let groupSessionList = [];
  pool.query(`SELECT s.group_id, s.title, s.time, s.meeting_url 
    FROM group_memberships g JOIN group_sessions s ON s.group_id = g.group_id 
    WHERE g.user_id = $1`, [currUser.user_id]).then(result => {
    // console.log(result.rows);

    for (let i = 0; i < result.rowCount; i++) {
      let curr = result.rows[i];
      groupSessionList.push({session: curr, mem_list: getSessionMembers(curr.group_id)});  // {session: {group_id, title, time, meeting_url}, mem_list: [{username, user_id}, ...]}
    }
  })
  .catch(error => {
    console.error("error:", error);
    res.status(500).json({error: "Something went wrong."});
  });

  res.status(200).json({rows: groupSessionList});
});

app.post("/session/create", authorize, (req, res) => {
  let body = req.body; // {title, time, meeting_url}

  if (
    !body.hasOwnProperty("title") ||
    !body.hasOwnProperty("time")
  ) {
    return res.status(404).json({error: "Missing session title or time"});
  }

  let title = body.title;
  let time =  body.time;
  let meeting_url = body.meeting_url;

  if (!meeting_url) {
    meeting_url = "";
  }

  pool.query(
    `INSERT INTO group_sessions(title, time, meeting_url)
    VALUES($1, $2, $3)
    on conflict do nothing
    RETURNING *`,
    [title, time, meeting_url],
  )
  .then((result) => {
    let group_id = result.rows[0].group_id;

    pool.query(
      `INSERT INTO group_memberships(group_id, user_id)
      VALUES($1, $2)
      on conflict do nothing
      RETURNING *`,
      [group_id, currUser.user_id],
    )
    .then((result) => {})
    .catch((error) => {
      console.log(error);
      return res.status(500).send();
    })
  })
  .catch((error) => {
    console.log(error);
    return res.status(500).send();
  })

})

app.post("/session/member", authorize, (req, res) => {
  let body = req.body;   // {group_id, user_id}

  if (
    !body.hasOwnProperty("group_id") ||
    !body.hasOwnProperty("user_id")
  ) {
    return res.status(404).json({error: "Missing required fields"});
  }

  pool.query(`SELECT * FROM group_memberships WHERE user_id = $1 AND group_id = $2`, [currUser.user_id, body.group_id]).then(result => {
    if (result.rowCount == 0) {
      res.status(403).json({error: "You do not have permission to modify this group study session"});
    } else {
      pool.query(`INSERT INTO group_memberships(group_id, user_id)
        VALUES($1, $2)
        on conflict do nothing
        RETURNING *`,
        [body.group_id, body.user_id],
      )
      .then((result) => {})
      .catch((error) => {
        console.log(error);
        return res.status(500).send();
      })
    }
  })
  .catch(error => {
    console.error("error:", error);
    res.status(500).json({error: "Something went wrong."});
  });
})


function invalidChatId(chatId) {
  chatIdValue = parseInt(chatId)
  if (isNaN(chatIdValue)) {
    return true;
  }
  
  pool.query(
    "SELECT * FROM chats WHERE chat_id = $1", [chatId]
  ).then(result => {
    return result.rows.length === 1
  })
}

app.get("/friends", authorize, (req, res) => {
  return res.sendFile("public/friends/friends.html", { root: __dirname });
});

app.get("/friends/:chatId", authorize, (req, res) => {
  let { chatId } = req.params;
  let userId = res.locals.userId

  if (invalidChatId(chatId)) {
    return res.status(404).send();
  }

  return res.sendFile("public/friends/index.html", { root: __dirname });
})

app.get("/chat", authorize, async (req, res) => {
  let userId = res.locals.userId;
  try {
    results = await pool.query(
      `SELECT t1.chat_id as chat_id, t2.user_id as friend_id FROM (SELECT * FROM user_chat as t1 WHERE user_id = $1) as t1
       JOIN user_chat as t2 ON t1.chat_id = t2.chat_id AND t2.user_id != $1;`
      , [userId]);
    res.status(200).json(results.rows);
  } catch {
    return res.sendStatus(500);
  }
})

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
  let newChatId;

  pool.query(
    "SELECT * FROM users WHERE user_id = ANY($1)", [body["otherUserIds"]]
  ).then(result => {
    users = result.rows;
    if (body["otherUserIds"].length != users.length) {
      throw 400;
    }
    if (body["otherUserIds"].length != users.length) {
      throw 400;
    }
    return pool.query("INSERT INTO chats DEFAULT VALUES RETURNING *")
  }).then((result) => {
    let query = "INSERT INTO user_chat(chat_id, user_id) VALUES "
    newChatId = result.rows[0].chat_id;
    let values = []
    values.push([newChatId, res.locals.userId])

    for (let userId of body["otherUserIds"]) {
      values.push([newChatId, userId])
    }
    
    let count = 1;
    for (let i = 0; i < values.length; i++) {
      query += "("
      for(let j = 0; j < values[i].length; j++) {
        query += "$"
        query += `${count}`
        if (j !== values[i].length - 1) {
          query += ", "
        }
        count++;
      }
      query += ")"
      if (i !== values.length - 1) {
        query += ","
      }
    }

    return pool.query(query, values.flat());
  }).then(() => {
    return res.status(200).json({ "chatId": newChatId });
  }).catch((error) => {
    console.log(error);
    if (error === 400){
      return res.sendStatus(400);
    }
    return res.sendStatus(500);
  })
})

app.get("/messages/:chatId", (req, res) => {
  let { chatId } = req.params;
  return res.sendFile("public/messages/index.html", { root: __dirname });
})

app.get("/chat-messages", (req, res) => {
  let { chatId } = req.query;
  if (invalidChatId(chatId)) {
    return res.sendStatus(400);
  }
  
  pool.query(
    `SELECT chat_id, sender_id, username AS sender_username, chat_message, sent_date FROM
    (SELECT * FROM chat_messages WHERE chat_id = $1) as t1
    LEFT JOIN users ON t1.sender_id = users.user_id
    ORDER BY sent_date`, 
    [chatId]
  ).then((result) => {
    return res.status(200).json({messages: result.rows})
  }).catch((error) => {
    console.log(error)
  })
}) 

app.get("/study-sets/load", authorize, async (req, res) => {
  try {
      const result = await pool.query(
        `SELECT title FROM study_sets WHERE creator_id = $1`,
        [res.locals.userId]
      );

      res.status(200).json(result.rows);
  } catch (error) {
      console.error('Error fetching study sets:', error);
      res.status(500).json({ error: 'Failed to fetch study sets.' });
  }
})

app.post("/study-sets/add", authorize, async (req, res) => {
  const { title } = req.body;
  try {
      const result = await pool.query(
          `INSERT INTO study_sets (title, creator_id) VALUES ($1, $2) RETURNING *`,
          [title, res.locals.userId]
      );
      const studyset = result.rows[0];
      await pool.query(
          `INSERT INTO flashcards (front, back, studyset_id) VALUES ($1, $2, $3)`,
          ["Default Front", "Default Back", studyset.id]
      );
      res.status(201).send({ message: "Study set added successfully" });
  } catch (error) {
      console.error("Error adding study set:", error);
      res.status(500).send("Internal server error");
  }
})

app.delete("/study-sets", authorize, async (req, res) => {
  const { title } = req.body;
  try {
      const result = await pool.query(
          `DELETE FROM study_sets WHERE title = $1 AND creator_id = $2 RETURNING *`,
          [title, res.locals.userId]
      );
      if (result.rowCount === 0) {
          return res.status(404).send({ error: "Study set not found" });
      }
      res.status(200).send({ message: "Study set deleted successfully" });
  } catch (error) {
      console.error("Error deleting study set:", error);
      res.status(500).send("Internal server error");
  }
});

app.get("/study-sets/show", authorize, async (req, res) => {
  const { title } = req.query;
  try {
      const studysetIdResult = await pool.query(
          `SELECT id FROM study_sets WHERE title = $1 AND creator_id = $2`,
          [title, res.locals.userId]
      );
      if (studysetIdResult.rowCount === 0) {
          return res.status(404).send({ error: "Study set not found" });
      }
      const studysetId = studysetIdResult.rows[0].id;
      const flashcardsResult = await pool.query(
          `SELECT studyset_id, id, front, back FROM flashcards WHERE studyset_id = $1`,
          [studysetId]
      );
      res.status(200).json(flashcardsResult.rows);
  } catch (error) {
      console.error("Error fetching study set or flashcards:", error);
      res.status(500).send("Internal server error");
  }
});

app.post("/flashcards/add", authorize, async (req, res) => {
  const { studysetId, front, back } = req.body;
  try {
      const result = await pool.query(
          `INSERT INTO flashcards (studyset_id, front, back) 
          VALUES ($1, $2, $3) 
          RETURNING *`,
          [studysetId, front, back]
      );
      res.status(200).json(result.rows[0]);
  } catch (error) {
      console.error("Error adding flashcard:", error);
      res.status(500).send("Internal server error");
  }
});

app.put("/flashcards/edit", authorize, async (req, res) => {
  const { flashcardId, front, back } = req.body;
  try {
      const result = await pool.query(
          `UPDATE flashcards SET front = $1, back = $2 WHERE id = $3 RETURNING *`,
          [front, back, flashcardId]
      );
      if (result.rowCount === 0) {
          return res.status(404).send("Flashcard not found");
      }
      res.status(200).json(result.rows[0]);
  } catch (error) {
      console.error("Error editing flashcard:", error);
      res.status(500).send("Internal server error");
  }
});

app.delete("/flashcards/delete", authorize, async (req, res) => {
  const { flashcardId } = req.body;
  try {
      const result = await pool.query(
          `DELETE FROM flashcards WHERE id = $1 RETURNING *`,
          [flashcardId]
      );
      if (result.rowCount === 0) {
          return res.status(404).send("Flashcard not found");
      }
      res.status(200).json({ message: "Flashcard deleted successfully" });
  } catch (error) {
      console.error("Error deleting flashcard:", error);
      res.status(500).send("Internal server error");
  }
});




io.on("connection", async (socket) => {
  console.log(`Socket ${socket.id} connected`);

  let url = socket.handshake.headers.referer;
  let pathParts = url.split("/");
  let chatId = pathParts[pathParts.length - 1];
  
  let cookies;
  try {
    cookies = cookie.parse(socket.handshake.headers.cookie);
  } catch {
  }
  
  try {
    socket.data.userId = await getUserId(cookies.token);
    socket.data.userDetails = await getUserDetails(socket.data.userId);
  } catch {
    // socket.disconnect();
  }
  
  if (invalidChatId(chatId)) {
    return;
  }
  socket.data.currentChatId = chatId;
  socket.join(chatId);
  

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
  });

  socket.on("join", ({chatId}) => {
    chatId = chatId.toString();
    socket.leave(socket.data.currentChatId);
    socket.data.currentChatId = chatId;
    socket.join(chatId);
  })

  socket.on("send message", ({ message }) => {
    pool.query(
      "INSERT INTO chat_messages(chat_id, sender_id ,chat_message, sent_date) VALUES($1, $2, $3, $4) RETURNING *",
      [chatId, socket.data.userId ,message, new Date(new Date().toISOString())]
    ).then((result) => {
      socket.to(socket.data.currentChatId).emit("sent message", {"message": message, "sender_username": socket.data.userDetails.username});
      console.log(message)
    }).catch(error => {
      console.log(error);
    });
  });
});


/*
KEEP EVERYTHING BELOW HERE
*/

server.listen(port, host, () => {
	console.log(`http://${host}:${port}`);
});
