# Community Blog & Article Publishing API

A REST API where people can register, publish posts, and comment on each other's posts.
Authentication uses JWT, passwords are hashed with bcrypt, and data is stored in MongoDB.

Architecture: **Routes → Controllers → Services → Models → MongoDB**

## Technologies

- Node.js (>= 20.19.0; use a currently supported LTS release)
- Express 5
- TypeScript 7
- MongoDB with Mongoose 9
- bcrypt (password hashing), jsonwebtoken (JWT), dotenv (environment variables)
- tsx (runs TypeScript directly in development)

## Installation

```powershell
npm.cmd install
```

## Environment variables

Create a file named `.env` in the project root (it is git-ignored). Use `.env.example` as a guide
for the variable names, then set your own values:

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `3000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing tokens, **at least 32 characters** |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `15m`, `12h`, `1d` (default `1d`) |

Generate a strong secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

If `JWT_SECRET` or `MONGODB_URI` is missing, the server stops at startup with a clear message.

## MongoDB connection setup

**Local MongoDB**

1. Install and start MongoDB Community Server.
2. Set `MONGODB_URI=mongodb://127.0.0.1:27017/community-blog`

**MongoDB Atlas**

1. Create a cluster and a database user.
2. Allow your IP address under *Network Access*.
3. Copy the connection string and set
   `MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/community-blog?retryWrites=true&w=majority`
   (URL-encode special characters in the password).

The database and collections are created automatically on first use.

## Commands

| Command | What it does |
|---|---|
| `npm.cmd run dev` | Development server with auto-restart (tsx) |
| `npm.cmd run build` | Compiles TypeScript into `dist/` |
| `npm.cmd start` | Runs the compiled app (`node dist/index.js`). Run `build` first |
| `npm.cmd run typecheck` | Type-checks without writing files |

Production:

```powershell
npm.cmd install
npm.cmd run build
$env:NODE_ENV="production"; npm.cmd start
```

## Authentication

Log in (or register) to receive a token, then send it on protected requests:

```
Authorization: Bearer <your-token>
```

## Response format

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{ "success": false, "message": "Description of what went wrong" }
```

| Status | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error or invalid ID |
| 401 | Missing, invalid or expired token / wrong credentials |
| 403 | Logged in, but not the owner of the resource |
| 404 | Record or route not found |
| 409 | Email already registered |
| 500 | Unexpected server error |

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/users/register` | No | Register |
| POST | `/api/users/login` | No | Log in |
| GET | `/api/users` | Yes | List all users |
| GET | `/api/users/me` | Yes | Get my profile |
| PUT | `/api/users/me` | Yes | Update my profile (send any of name, email, password) |
| DELETE | `/api/users/me` | Yes | Delete my account (and my posts/comments) |
| GET | `/api/users/:id` | Yes | Get a user by ID |
| GET | `/api/posts` | No | List all posts (newest first) |
| GET | `/api/posts/:id` | No | Get a post |
| POST | `/api/posts` | Yes | Create a post |
| PUT | `/api/posts/:id` | Yes (author only) | Update a post |
| DELETE | `/api/posts/:id` | Yes (author only) | Delete a post (and its comments) |
| GET | `/api/posts/:postId/comments` | No | List a post's comments |
| POST | `/api/posts/:postId/comments` | Yes | Comment on a post |
| GET | `/api/comments/:id` | No | Get a comment |
| PUT | `/api/comments/:id` | Yes (author only) | Update a comment |
| DELETE | `/api/comments/:id` | Yes (author only) | Delete a comment |

### Validation rules

- `name`: 2–50 characters
- `email`: valid email, unique (stored lowercase)
- `password`: 8–72 bytes
- post `title`: 3–150 characters; post `content`: 1–20,000 characters
- comment `content`: 1–2,000 characters

### Register — `POST /api/users/register`

```json
{ "name": "Alice", "email": "alice@example.com", "password": "password123" }
```

`201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "66f0c0a1b2c3d4e5f6a7b8c9",
      "name": "Alice",
      "email": "alice@example.com",
      "createdAt": "2026-11-09T10:00:00.000Z",
      "updatedAt": "2026-11-09T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

`409 Conflict`

```json
{ "success": false, "message": "Email is already registered" }
```

### Login — `POST /api/users/login`

```json
{ "email": "alice@example.com", "password": "password123" }
```

`200 OK` returns the same shape as register. Wrong credentials give `401`:

```json
{ "success": false, "message": "Invalid email or password" }
```

### Update my profile — `PUT /api/users/me`

```json
{ "name": "Alice Smith" }
```

### Create a post — `POST /api/posts`

```json
{ "title": "My First Post", "content": "Hello, community!" }
```

`201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "66f0c1b2b2c3d4e5f6a7b8d0",
    "title": "My First Post",
    "content": "Hello, community!",
    "author": { "_id": "66f0c0a1b2c3d4e5f6a7b8c9", "name": "Alice" },
    "createdAt": "2026-11-09T10:05:00.000Z",
    "updatedAt": "2026-11-09T10:05:00.000Z"
  }
}
```

### Update a post — `PUT /api/posts/:id`

```json
{ "title": "Updated title" }
```

Send `title`, `content`, or both. If you are not the author:

`403 Forbidden`

```json
{ "success": false, "message": "You can only update your own posts" }
```

### Create a comment — `POST /api/posts/:postId/comments`

```json
{ "content": "Great post!" }
```

`201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "66f0c2c3b2c3d4e5f6a7b8e1",
    "content": "Great post!",
    "post": "66f0c1b2b2c3d4e5f6a7b8d0",
    "author": { "_id": "66f0c0a1b2c3d4e5f6a7b8c9", "name": "Alice" },
    "createdAt": "2026-11-09T10:10:00.000Z",
    "updatedAt": "2026-11-09T10:10:00.000Z"
  }
}
```

### Delete examples

`200 OK`

```json
{ "success": true, "message": "Post deleted successfully" }
```

### Common errors

`400` invalid ID

```json
{ "success": false, "message": "Invalid post ID" }
```

`401` missing token

```json
{ "success": false, "message": "Authentication required. Send the header \"Authorization: Bearer <token>\"" }
```

`404` missing record

```json
{ "success": false, "message": "Post not found" }
```

## Notes

- Password hashes are never returned: the field is excluded from queries and removed from JSON output.
- Posts and comments show only the author's `id` and `name`.
- Deleting a post deletes its comments. Deleting a user deletes their posts, their comments,
  and the comments on their posts.
- Tokens stop working immediately if the user account is deleted.
- Lists are not paginated. Add pagination before using this with large amounts of data.

## Project structure

```text
src/
├── controllers/   # Read the request, call a service, send the response (+ authenticate middleware)
├── models/        # Mongoose schemas and the database connection
├── routes/        # URL → controller mapping
├── service/       # Business logic and input validation
├── utils/         # Error classes, validation helpers, error-handling middleware
└── index.ts       # App setup and server start
```