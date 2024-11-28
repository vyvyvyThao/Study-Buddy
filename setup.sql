DROP DATABASE IF EXISTS studybuddy;

CREATE DATABASE studybuddy;
\c studybuddy

CREATE TABLE users (
	user_id SERIAL PRIMARY KEY,
	username VARCHAR (20) UNIQUE NOT NULL,
    password VARCHAR (100) NOT NULL,
    email VARCHAR (255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_login TIMESTAMP
);

CREATE TABLE friend_requests (
    request_id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(user_id),
    user_id INTEGER REFERENCES users(user_id)
);

CREATE TABLE friendships (
    user1_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    user2_id INTEGER REFERENCES users(user_id),
    PRIMARY KEY (user1_id, user2_id)
);


CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR (50) NOT NULL,
    due TIMESTAMP NOT NULL,
    progress BOOLEAN,
    creator_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    content VARCHAR (1000) NOT NULL,
    creator_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE study_sets (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR (50) NOT NULL
);

CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    studyset_id INTEGER REFERENCES study_sets(id) ON DELETE CASCADE,
    front VARCHAR (300) NOT NULL,
    back VARCHAR (300) NOT NULL
);

CREATE TABLE group_sessions (
    group_id SERIAL PRIMARY KEY,
    title VARCHAR (50) NOT NULL,
    time TIMESTAMP NOT NULL,
    meeting_url VARCHAR (500)
);

CREATE TABLE group_memberships (
    group_id INTEGER REFERENCES group_sessions(group_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id),
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE login_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR (100) NOT NULL,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT INTO users(user_id, username, password, email, created_at)
VALUES (1, 'test', '$argon2id$v=19$m=65536,t=3,p=4$sGSNXvZ1XOCwsE9Oo0hZmw$rLXVHw1A+mCip+Nzs2BYLfhMVh/l3KjiYY3zt0j35Jw', 'test1@gmail.com', '2024-11-12 18:57:25'),
(2, 'test2', '$argon2id$v=19$m=65536,t=3,p=4$tRdux4KRbuFrE8zu2lg+Sg$tqXhH7197yHdNEemzSj2wDZC5V4EiAegAI7aItkeS5w', 'test2@gmail.com', '2024-11-12 18:57:25');

INSERT INTO login_tokens (token, user_id) VALUES ('7b1e2b512344749b813f9322bf5ed4b55dce', 1);


CREATE TABLE chats(
    chat_id SERIAL PRIMARY KEY 
);

INSERT INTO chats(chat_id) VALUES (1);

CREATE TABLE user_chat(
    chat_id INTEGER,
    user_id INTEGER,
    CONSTRAINT fk_chat_id FOREIGN KEY(chat_id) REFERENCES chats(chat_id),
    CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(user_id),
    PRIMARY KEY(chat_id, user_id)
);

INSERT INTO user_chat(chat_id, user_id) VALUES (1, 1), (1, 2);

CREATE TABLE chat_messages(
    chat_id INTEGER,
    sender_id INTEGER REFERENCES users(user_id) DEFAULT NULL,
    chat_message TEXT,
    sent_date TIMESTAMP NOT NULL
);

INSERT INTO chat_messages(chat_id, chat_message, sent_date) VALUES (1, 'Filler text for setup', '2024-11-12 18:57:25');

INSERT INTO friendships(user1_id, user2_id) VALUES (1, 2);