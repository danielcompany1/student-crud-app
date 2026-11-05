# Student CRUD App

A small local student directory built with Node.js, Express, MySQL, and plain browser JavaScript. The Express server serves both the web page and its JSON API.

> **Local-only classroom app:** the server binds to `127.0.0.1`. It has no login. Do not expose it to a network or the internet without adding authentication, CSRF protection, and HTTPS.

## Requirements

- Node.js current LTS (Node.js 26 is LTS as of November 2026; use the latest patch release). Check the [official release schedule](https://nodejs.org/en/about/previous-releases).
- MySQL Server 8.0.16 or newer, running locally (the schema uses enforced `CHECK` constraints)
- MySQL command-line client

Check the installed tools:

```sh
node --version
npm --version
mysql --version
```

## 1. Confirm the database name is unused

From this project directory, ask MySQL whether the requested database already exists:

```sh
mysql -u root -p -e "SHOW DATABASES LIKE 'student_crud_db';"
```

Enter your own MySQL administrator password at the prompt. If the command returns `student_crud_db`, **stop here**. Do not run `database/schema.sql` or `database/seed.sql`. Choose a different new database name, then replace `student_crud_db` in `database/schema.sql`, `database/seed.sql`, the app-user grant below, and `.env`'s `DB_NAME` with that name.

If the query returns no rows, create the new database and table:

```sh
mysql --default-character-set=utf8mb4 -u root -p < database/schema.sql
```

The schema file intentionally has no `IF NOT EXISTS`: if the name is taken between the check and create, MySQL reports an error instead of silently selecting an existing database. It also creates `students` without replacing an existing table.

## 2. Create a least-privilege application user

Sign in to MySQL as an administrator:

```sh
mysql -u root -p
```

At the MySQL prompt, replace the example password with your own long random password, then run:

```sql
CREATE USER 'student_app'@'127.0.0.1' IDENTIFIED BY 'replace-with-your-own-long-random-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON student_crud_db.* TO 'student_app'@'127.0.0.1';
EXIT;
```

The application account can read and change student records in this one database. It cannot create or alter databases and tables. The app itself never uses the MySQL root account.

## 3. Load the fictional sample records once

After creating the app user, load the sample rows exactly once:

```sh
mysql --default-character-set=utf8mb4 -h 127.0.0.1 -u student_app -p student_crud_db < database/seed.sql
```

Use the password you chose for `student_app`. The records have fictional names, reserved `example.com` addresses, and placeholder phone numbers. Do not run the seed file again; it inserts records and is not a reset script.

## 4. Configure and run the app

Copy the example environment file and edit `.env` to match the MySQL app user you created:

```sh
cp .env.example .env
```

Set `DB_PASSWORD` to your app-user password. Keep `DB_NAME=student_crud_db` unless you selected another unused name and updated the SQL files and grant. `.env` is ignored by Git.

Install the dependencies, then run the development server:

```sh
npm install
npm run dev
```

Open <http://127.0.0.1:3000>. The development command restarts the server when files change. For normal startup, stop the development server and run:

```sh
npm start
```

If port 3000 is occupied, set `PORT` to another unused port in `.env` and restart. The app continues to bind only to `127.0.0.1`.

## API endpoints

All endpoints use JSON. Successful responses have `{ "success": true, "data": ... }`; errors have `{ "success": false, "error": { "code": ..., "message": ..., "fieldErrors": ... } }` when a field needs correction.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/students?q=search&page=1&limit=10` | Search and paginate records |
| `GET` | `/api/students/:id` | Read one student |
| `POST` | `/api/students` | Create a student |
| `PUT` | `/api/students/:id` | Replace a student's editable fields |
| `DELETE` | `/api/students/:id` | Delete a student |

Create and update bodies use these fields: `first_name`, `last_name`, `email`, `phone`, `program`, `year_level`, `enrollment_date` (`YYYY-MM-DD`), and `status` (`Active`, `On Leave`, or `Graduated`). `phone` may be an empty string or `null`.

## Common MySQL connection issues

- **`ECONNREFUSED`:** Start the local MySQL Server and confirm `DB_HOST=127.0.0.1` and `DB_PORT=3306` match its listener.
- **`ER_ACCESS_DENIED_ERROR`:** Confirm the username and password in `.env` match the account created for host `127.0.0.1`. MySQL users are scoped by both username and host.
- **Unknown database:** Confirm the schema command succeeded and `DB_NAME` matches the name in both SQL files.
- **Table missing:** Run `database/schema.sql` only after confirming the database name is unused. Do not point the app at an existing database that contains an unrelated table.
- **Seed reports duplicate values:** The seed script has already been run. Do not rerun it; it is deliberately a one-time insert.
- **Environment changes appear ignored:** Restart the app after editing `.env`, and make sure the file is named `.env` in the project root.

## Project layout

```text
student-crud-app/
├── database/       # New database schema and one-time sample seed
├── public/         # HTML, CSS, and browser JavaScript
├── src/config/     # MySQL connection pool
├── src/routes/     # Student API and server validation
├── .env.example
├── .gitignore
├── package.json
└── server.js
```
