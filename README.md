# Course Feedback

A MERN application for students to discover courses and submit ratings and feedback. Faculty can enlist courses, analyze ratings, and reply to reviews. Administrators can approve or remove courses, issue faculty invitations, manage administrator access, and review account and feedback analytics.

## Requirements

- Node.js 20+
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

1. Install the root development dependency:

   ```sh
   npm install
   ```

2. Install both application packages:

   ```sh
   npm install --prefix server
   npm install --prefix client
   ```

3. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and a long, random `JWT_SECRET`.

4. Start the API and frontend:

   ```sh
   npm run dev
   ```

   The frontend is at `http://localhost:5173` and the API is at `http://localhost:5000`.

## Accounts

Register through the app as a student. Administrators generate one-time, seven-day professor invitation codes from the admin dashboard and share them only with verified faculty. Faculty select **Professor / faculty** during registration, then can enlist courses, claim unassigned catalog courses listed under their account name, view rating distributions and reviews, and reply to feedback on courses they own. Newly enlisted courses remain hidden from students until an administrator approves them. Students can see professor replies on course pages.

To create an administrator, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `server/.env`, then run:

```sh
npm run seed:admin
```

Public registration cannot create administrator accounts.

Administrators can create additional administrator accounts from the admin dashboard. The initial administrator is created from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` by running `npm run seed:admin`.

## Sample computer engineering courses

Set `COURSE_TERM` in `server/.env` if you want a term other than `Fall 2026`, then run:

```sh
npm run seed:courses
```

This safely adds ten sample computer engineering courses without overwriting existing courses. Professor names are illustrative demo data; replace them with your institution's actual faculty. Sign in as an administrator and choose **Admin** to review overall ratings, per-course response counts, and recent feedback. Students can open any course to rate it and leave a comment.

## Production build

```sh
npm run build
npm start
```

Set `CLIENT_ORIGIN` to the frontend's production origin. The API expects the built frontend to be hosted separately.
