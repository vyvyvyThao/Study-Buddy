CREATE DATABASE studybuddy;
\c studybuddy

CREATE TABLE users (
	user_id SERIAL PRIMARY KEY,
	username VARCHAR (20) UNIQUE NOT NULL,
    password VARCHAR (20) NOT NULL,
    email VARCHAR (255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_login TIMESTAMP, 

    friend_list INTEGER[], -- list of friends'  user_ids
    goals INTEGER[]
    -- group_study_sessions INTEGER[]
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
)

CREATE TABLE group_sessions (
    group_id SERIAL PRIMARY KEY,
    title VARCHAR (50) NOT NULL,
    time TIMESTAMP NOT NULL,
    meeting_url VARCHAR (500),
    -- members INTEGER[]
);

CREATE TABLE group_memberships (
    group_id INTEGER REFERENCES group_sessions(group_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
);