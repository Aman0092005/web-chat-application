# Chatterly — local college chat project

A WhatsApp-inspired real-time chat web app built with React, Express, Socket.IO, and MongoDB.

## Included

- Register / sign in with encrypted passwords and JWT sessions
- Search fellow users and start individual conversations
- Create named groups, choose members, and chat in real time
- Instant messages, typing indicator, message ordering, timestamps, and familiar responsive chat UI
- MongoDB models for users, chats, and messages

## Run it locally

1. Ensure the local MongoDB service is running.
2. In this folder, install dependencies. The `--cache` portion avoids Windows global npm-cache permission issues:

   ```powershell
   npm install --cache .npm-cache
   npm install --prefix server --cache .npm-cache
   npm install --prefix client --cache .npm-cache
   ```

3. Copy `server/.env.example` to `server/.env`. The supplied default MongoDB URL is already suitable for a standard local installation.
4. Start both apps:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:5173`. Create two accounts in separate browser windows to demonstrate real-time messaging.

The API starts on `http://localhost:5000`. MongoDB stores its data in a database called `chatterly`.

## Project structure

```
client/     React + Vite application
server/     Express API, Socket.IO gateway, Mongoose models
```
