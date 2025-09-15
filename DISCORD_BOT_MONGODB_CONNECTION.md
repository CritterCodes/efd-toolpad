# Discord Bot MongoDB Connection Guide

## Overview
This document provides all the necessary information for your Discord bot to connect to your MongoDB database, including connection strings, setup instructions, and a list of known collections.

---

## 1. MongoDB Connection String

Replace `<username>`, `<password>`, and `<cluster-url>` with your actual credentials and cluster information.

**Standard Connection String:**
```
mongodb+srv://<username>:<password>@<cluster-url>/efd?retryWrites=true&w=majority
```

- `<username>`: Your MongoDB Atlas username
- `<password>`: Your MongoDB Atlas password
- `<cluster-url>`: Your cluster's URL (e.g., cluster0.xxxxx.mongodb.net)
- `efd`: The database name (change if your DB name is different)

---

## 2. Node.js Setup (with Mongoose)

Install Mongoose:
```
npm install mongoose
```

**Sample Connection Code:**
```js
const mongoose = require('mongoose');

const uri = 'mongodb+srv://<username>:<password>@<cluster-url>/efd?retryWrites=true&w=majority';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected!'))
.catch(err => console.error('MongoDB connection error:', err));
```

---

## 3. Known Collections

Below are the known collections in your database (update as needed):

- `users`            // Discord users and bot users
- `guilds`           // Discord server (guild) data
- `messages`         // Logged messages or bot interactions
- `settings`         // Bot configuration and preferences
- `commands`         // Custom commands and metadata
- `logs`             // Bot activity logs
- `tasks`            // Scheduled tasks or reminders
- `roles`            // Discord roles and permissions
- `tickets`          // Support or moderation tickets
- `events`           // Event tracking (e.g., joins, leaves)

---

## 4. Example: Defining a Mongoose Model

```js
const userSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  joinedAt: Date,
  roles: [String],
});

const User = mongoose.model('User', userSchema, 'users');
```

---

## 5. Security Tips
- Never commit your actual connection string with credentials to public repositories.
- Use environment variables to store sensitive data:
  ```js
  const uri = process.env.MONGODB_URI;
  ```
- Restrict database user permissions to only what's necessary for your bot.

---

## 6. Troubleshooting
- Ensure your IP address is whitelisted in MongoDB Atlas.
- Double-check credentials and cluster URL.
- Use `console.log` for connection errors.

---

## 7. Resources
- [Mongoose Docs](https://mongoosejs.com/docs/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Discord.js Guide](https://discordjs.guide/)

---

*Update this document as your bot evolves and new collections are added.*
