const pg = require("pg");
const express = require("express");

const http = require("http");
const { Server } = require("socket.io");

const app = express();
let server = http.createServer(app);
let io = new Server(server);

let currUser;     // for logged in user's data

process.chdir(__dirname);

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

app.post("/register", (req, res) => {
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
      body["username"].length > 20 ||
      body["password"].length > 20 ||
      body["email"].length > 255
    ) {
      return res.status(400).json({error: 'Username, password must be below 20 characters'});
    }
  }

  let {username, email, password, timestamp} = body;
  console.log("IN SERVER: ", username, email, password, timestamp);
  pool.query(
    `INSERT INTO users(username, password, email, created_at)
    VALUES($1, $2, $3, $4)
    RETURNING *`,
    [username, password, email, timestamp],
  )
  .then((result) => {
    console.log("Success");
  })
  .catch((error) => {
    console.log(error);
    return res.status(500).send();
  })
});

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});