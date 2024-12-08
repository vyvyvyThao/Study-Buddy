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

CREATE TABLE friendships (
    user1_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    user2_id INTEGER REFERENCES users(user_id),
    user1_accepted BOOLEAN,
    user2_accepted BOOLEAN,
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

CREATE TABLE chats(
    chat_id SERIAL PRIMARY KEY 
);

CREATE TABLE user_chat(
    chat_id INTEGER,
    user_id INTEGER,
    CONSTRAINT fk_chat_id FOREIGN KEY(chat_id) REFERENCES chats(chat_id),
    CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(user_id),
    PRIMARY KEY(chat_id, user_id)
);

CREATE TABLE chat_messages(
    chat_id INTEGER,
    sender_id INTEGER REFERENCES users(user_id) DEFAULT NULL,
    chat_message TEXT,
    sent_date TIMESTAMP NOT NULL
);

INSERT INTO users(user_id, username, password, email, created_at)
VALUES 
(1, 'test', '$argon2id$v=19$m=65536,t=3,p=4$sGSNXvZ1XOCwsE9Oo0hZmw$rLXVHw1A+mCip+Nzs2BYLfhMVh/l3KjiYY3zt0j35Jw', 'test1@gmail.com', '2024-11-12 18:57:25'),
(2, 'test2', '$argon2id$v=19$m=65536,t=3,p=4$tRdux4KRbuFrE8zu2lg+Sg$tqXhH7197yHdNEemzSj2wDZC5V4EiAegAI7aItkeS5w', 'test2@gmail.com', '2024-11-12 18:57:25'),
(3, 'test3', '$argon2id$v=19$m=65536,t=3,p=4$bOymKcC6kN8tyC88Eaq1Eg$e4/UlQAEPEsvxS0tNyrTx8bMBFY5UQkNbS5foO7lCVc', 'test3@gmail.com', '2024-11-12 18:57:25'),
(4, 'test4', '$argon2id$v=19$m=65536,t=3,p=4$z/5wL/hh8waQoqp4p5wmHA$8R6NjOuFjz/X+E3jrnJ6Yxh0FriZfKC7v8mRZKg+QuY', 'test4@gmail.com', '2024-11-12 18:57:25');

INSERT INTO login_tokens (token, user_id) VALUES ('7b1e2b512344749b813f9322bf5ed4b55dce', 1);

INSERT INTO chats(chat_id) VALUES (1);
ALTER SEQUENCE chats_chat_id_seq RESTART WITH 2;

INSERT INTO user_chat(chat_id, user_id) VALUES (1, 1), (1, 2);

INSERT INTO chat_messages(chat_id, sender_id, chat_message, sent_date) 
VALUES 
(1, 2, 'Filler text for setup by test2', '2024-11-12 18:57:25'),
(1, 1, 'Filler text for setup by test', '2024-11-12 18:57:25');

INSERT INTO friendships(user1_id, user2_id, user1_accepted, user2_accepted) VALUES (1, 2, true, true), (1,4, true, true), (2,3, true, true), (2,4, true, true);

INSERT INTO study_sets(id, creator_id, title) VALUES (1, 1, 'SE310'), (2, 1, 'French'), (3, 2, 'German');
INSERT INTO flashcards(studyset_id, front, back) VALUES (1, 'process of breaking down a complex process into smaller, simpler parts', 'functional decomposition'), (1, 'object relies on another to provide a sepecified set of functionality', 'delegation'), (1, 'manner & degree of interdependence', 'coupling'), (1, 'degree to which elements of a module belong together', 'cohesion'), (2, 'Hello', 'Bonjour'), (2, 'Goodbye', 'Au revoir'), (2, 'Thank you', 'Merci'), (3, 'Good day', 'Guten tag'), (3, 'Thanks', 'Danke'), (3, 'Goodbye', 'Auf Wiedersehen');