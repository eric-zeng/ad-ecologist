# Ad Prices Backend
This directory contains the backend, which will receive data from the extension
and host the study website.

## First Time Setup
### 1. Install npm Dependencies
```npm install```

### 2. Database Setup
- First, install [PostgreSQL](https://www.postgresql.org/download/)
- Start a postgres server. This will create a default database named "postgres",
  a default user named "postgres" or your user account, on port 5432.
- Create the database and tables for the study. Run `psql` to open
the command line prompt for Postgres.
- Run a create database command
```
CREATE DATABASE ad_prices;
```
- Then, connect to the new database
```
\c ad_prices
```

- Then, run the CREATE TABLE commands in db.sql:
```
CREATE TABLE ad (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP,
  parent_url TEXT,
  screenshot TEXT
);
```
- In the future, to connect to this database, run `psql -d ad_prices`
- Create a credentials file named "pg_creds.json" in this folder, so that the
  server can access it. You may not need the host or port fields if using the default settings, Postgres will instead run over a unix socket instead of a network socket. Example:
```
{
  "host": "localhost",
  "port": 5432,
  "user": "postgres",
  "password": "batteryhorsestaple",
  "database": "ad_prices"
}
```

## Running the server
The server is a Typescript + Node.js project, we need to compile the Typescript
into JavaScript, and then run it as a node script from the command line.

### Compiling
```
npm run build
```
Alternatively, to compile the server automatically when you save
a file, you can run:
```
tsc --watch
```

### Run the server
To run the server, run the compiled JavaScript file in the `gen/` folder.
You must specify where ad screenshots are saved using the `-s` flag, for example:
```
node gen/main.js -s ~/data/screenshots
```

You can also specify the name and location of the postgres credentials file,
if it is different from the default.
```
node gen/main.js -s ~/data/screenshots --pg_creds ~/custom_pg_creds.json
```

### Making requests to the server
If running on your local machine, the server will now be accessible at `localhost:6800`. You can visit this URL in the browser, or
make requests to it using JavaScript (using `fetch`).
