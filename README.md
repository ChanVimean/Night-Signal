# NestJS + Prisma + MySQL — Team CRUD Starter

A small backend project for learning NestJS, TypeScript, Prisma ORM, MySQL, REST APIs, and collaborative development.

This guide supports **Windows and macOS**. It assumes you already have a NestJS project or want to create one using the Nest CLI.

> **Architecture rule:** organize application code by business feature; keep the Prisma schema and migration history centralized. DBeaver is a database client, not the database server.

## Contents

- [1. Stack and downloads](#1-stack-and-downloads)
- [2. Install and verify tools](#2-install-and-verify-tools)
- [3. Start MySQL and connect DBeaver](#3-start-mysql-and-connect-dbeaver)
- [4. Create the project database](#4-create-the-project-database)
- [5. Install and configure Prisma 7](#5-install-and-configure-prisma-7)
- [6. Recommended project structure](#6-recommended-project-structure)
- [7. Create the Users CRUD feature](#7-create-the-users-crud-feature)
- [8. Run and test the API](#8-run-and-test-the-api)
- [9. Team workflow and conventions](#9-team-workflow-and-conventions)
- [10. Troubleshooting](#10-troubleshooting)
- [11. Definition of done](#11-definition-of-done)

## 1. Stack and downloads

| Tool                   | What it does                                   | Official download / documentation                                                                        |
| ---------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Node.js LTS            | Runs NestJS and npm                            | [nodejs.org](https://nodejs.org/)                                                                        |
| VS Code                | Code editor                                    | [code.visualstudio.com](https://code.visualstudio.com/)                                                  |
| NestJS                 | Backend framework                              | [NestJS docs](https://docs.nestjs.com/)                                                                  |
| MySQL Community Server | Stores application data                        | [MySQL downloads](https://dev.mysql.com/downloads/mysql/)                                                |
| DBeaver Community      | GUI for connecting to and inspecting databases | [DBeaver download](https://dbeaver.io/download/)                                                         |
| Git                    | Version control                                | [Git for Windows](https://git-scm.com/downloads/win) · [Git for macOS](https://git-scm.com/download/mac) |
| Postman                | Tests HTTP endpoints                           | [postman.com/downloads](https://www.postman.com/downloads/)                                              |
| Prisma ORM             | Database client and migrations                 | [Prisma docs](https://www.prisma.io/docs)                                                                |

### MySQL installation notes

- **Windows:** use the MySQL Installer or the MySQL Community Server download. During setup, note the port, username, and password you create.
- **macOS:** install MySQL Community Server using the official macOS package, or use a package manager if your team already standardizes on one. Follow the official installation guide and ensure the MySQL service is running.
- If your team uses a shared development database, you may not need a local MySQL Server. You still need the connection details and permission to access it.

### DBeaver is not MySQL Server

DBeaver is the application you use to _connect to_ a database. MySQL Server is the service that actually stores the data. DBeaver may prompt you to download a MySQL JDBC driver on first connection; allow it to do so.

## 2. Install and verify tools

Open a terminal in VS Code.

Check Node.js, npm, and Git:

```bash
node -v
npm -v
git --version
```

Use the Node.js version agreed upon by the team. Commit the lockfile (`package-lock.json`) and use `npm ci` for reproducible installs in a clean checkout or CI environment.

### If you already have a NestJS project

From the repository root:

```bash
npm install
npm run start:dev
```

The default NestJS starter normally listens on [http://localhost:3000](http://localhost:3000).

### If you are creating the project from scratch

Install the Nest CLI and create a project:

```bash
npm install -g @nestjs/cli
nest new nest-crud
cd nest-crud
```

Choose npm if the team is using npm.

## 3. Start MySQL and connect DBeaver

Make sure MySQL Server is installed and running before creating the connection.

The usual local settings are:

- Host: `localhost`
- Port: `3306`
- Username: the MySQL user created during installation
- Password: the password for that user

Your username may not be `root`; use the credentials you configured.

### Step A — Create a new connection

In DBeaver, click **New Database Connection** (often a plug/database icon or available from the Database menu), then select **MySQL**.

![DBeaver new connection walkthrough](docs/images/dbeaver-new-connection.png)

### Step B — Enter the connection details

Enter `localhost` as the host and `3306` as the port for a local default setup. Enter your MySQL username and password. The database field can be left blank while testing the initial server connection if DBeaver permits it.

![DBeaver MySQL connection settings](docs/images/dbeaver-mysql-settings.png)

### Step C — Test the connection

Click **Test Connection**. On the first connection, DBeaver may ask to download the MySQL driver. Allow the download and wait for it to finish, then test again.

![DBeaver test connection guide](docs/images/dbeaver-test-connection.png)

If it fails, check that the server is running, the host and port are correct, and your credentials are valid. See [Troubleshooting](#10-troubleshooting).

## 4. Create the project database

Once DBeaver is connected:

1. Open a SQL Editor for your MySQL connection.
2. Run the SQL below.
3. Refresh the connection's database tree if the new database does not appear.

```sql
CREATE DATABASE nest_crud;
```

![DBeaver create database walkthrough](docs/images/dbeaver-create-database.png)

This creates an empty database. **It does not create the tables.** Prisma migrations will create the tables from your Prisma schema.

## 5. Install and configure Prisma 7

This guide uses Prisma ORM 7. Keep Prisma packages on the same major version and commit `package.json` and `package-lock.json` so the whole team installs the same dependency tree.

Install the packages:

```bash
npm install -D prisma@7
npm install @prisma/client@7 @prisma/adapter-mariadb mariadb dotenv
npm install @nestjs/config
```

Initialize Prisma for MySQL:

```bash
npx prisma init --datasource-provider mysql
```

### Configure the Prisma CLI

In the project root, `prisma.config.ts` should load environment variables and point to the schema and migration directory:

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

### Configure `.env`

Create a `.env` file in the project root:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/nest_crud"
```

Replace `USER` and `PASSWORD` with your MySQL credentials. If your password contains special URL characters (such as `@`, `:`, `/`, or `#`), URL-encode those characters.

Create `.env.example` with placeholders for teammates:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/nest_crud"
```

Ensure `.env` is in `.gitignore`. **Never commit real passwords, tokens, or production credentials.**

### Configure the Prisma schema

For Prisma 7, use the `prisma-client` generator with an explicit output directory. In `prisma/schema.prisma`:

<!-- cspell:ignore autoincrement -->

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

The output path is relative to the schema file, so this generates the client under `src/generated/prisma/`.

### Configure NestJS environment variables

In `src/app.module.ts`, load environment variables with `ConfigModule`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

Keep your existing application imports when adding `ConfigModule`; do not replace the rest of your `AppModule`.

### Create the first migration

Make sure MySQL is running and `DATABASE_URL` is correct, then run:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

The migration is saved under `prisma/migrations/` and should be committed to Git.

### PrismaService and the MySQL adapter

Prisma 7 requires a database adapter for a direct MySQL connection. Keep its setup in `src/prisma/prisma.service.ts`, not inside each feature module.

A typical adapter setup reads the connection URL from configuration, parses its hostname, port, username, password, and database name, and passes those options to `PrismaMariaDb` from `@prisma/adapter-mariadb`. Then pass the adapter to `PrismaClient` from the generated client and manage `$connect()` / `$disconnect()` with NestJS lifecycle hooks.

The generated client import should match the output path above. Follow the current official examples rather than copying an older Prisma 6 setup:

- [Prisma ORM 7 MySQL quickstart](https://www.prisma.io/docs/orm/v7/quickstart/mysql)
- [NestJS Prisma recipe](https://docs.nestjs.com/recipes/prisma)

## 6. Recommended project structure

Keep the database schema and migrations at the repository root, and organize application code by feature.

```text
nest-crud/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── generated/
│   │   └── prisma/             # generated client; do not edit by hand
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── users/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── users.controller.spec.ts
│   ├── app.module.ts
│   └── main.ts
├── docs/
│   └── images/
├── test/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── prisma.config.ts
└── README.md
```

### Responsibilities

| Location                | Responsibility                                               |
| ----------------------- | ------------------------------------------------------------ |
| `prisma/schema.prisma`  | Defines database models and relationships                    |
| `prisma/migrations/`    | Tracks database schema changes                               |
| `src/prisma/`           | Shared Prisma client setup and NestJS dependency injection   |
| `src/users/`            | User endpoints, business logic, and DTOs                     |
| `src/generated/prisma/` | Generated Prisma Client; never edit generated files manually |
| `src/app.module.ts`     | Root application module                                      |

**Architecture rule:** feature modules use the shared Prisma service. Do not create a separate Prisma client for every feature. Keep schema and migration history centralized unless the team has a concrete reason to adopt a more complex setup.

## 7. Create the Users CRUD feature

Generate the feature files using the Nest CLI:

```bash
nest g module users
nest g controller users
nest g service users
```

Create DTOs inside `src/users/dto/`:

- `create-user.dto.ts`
- `update-user.dto.ts`

### CRUD endpoints

| Method   | Endpoint     | Purpose       |
| -------- | ------------ | ------------- |
| `POST`   | `/users`     | Create a user |
| `GET`    | `/users`     | List users    |
| `GET`    | `/users/:id` | Get one user  |
| `PATCH`  | `/users/:id` | Update a user |
| `DELETE` | `/users/:id` | Delete a user |

### Layer responsibilities

- **Controller:** receives HTTP requests, validates/forwards inputs, and returns responses.
- **Service:** implements business logic and uses the shared Prisma service for database operations.
- **DTO:** describes the request data and its validation rules.
- **Module:** registers the controller and providers for the feature.
- **Prisma service:** provides the shared database client.

Use NestJS validation with `ValidationPipe` and DTO decorators. Handle missing records and duplicate email addresses with appropriate HTTP errors. Do not put database queries directly in controllers.

## 8. Run and test the API

Start NestJS:

```bash
npm run start:dev
```

Use Postman to test each endpoint. Example create-user request:

**POST** `http://localhost:3000/users`

```json
{
  "name": "Alex",
  "email": "alex@example.com"
}
```

Then test listing, retrieving, updating, and deleting users.

You can also inspect the data in DBeaver by refreshing the `nest_crud` database tree and opening the `User` table. The exact table name depends on the Prisma model and any explicit mapping configured in the schema.

### Useful commands

```bash
# Install exact versions from the lockfile
npm ci

# Start development server
npm run start:dev

# Build
npm run build

# Unit tests
npm run test

# Lint
npm run lint

# Format
npm run format

# Check Prisma version
npx prisma -v

# Generate Prisma Client
npx prisma generate

# Create and apply a development migration
npx prisma migrate dev --name describe_your_change

# Open Prisma Studio
npx prisma studio
```

Use the scripts that exist in your project's `package.json`. `npm ci` is ideal for a clean install when the lockfile is committed; use `npm install` when intentionally updating dependencies.

## 9. Team workflow and conventions

### Naming and code organization

- Use feature-based folders: `users/`, `products/`, `orders/`.
- Use filenames such as `users.service.ts` and `create-user.dto.ts`.
- Use `PascalCase` for classes and DTOs.
- Use `camelCase` for variables and methods.
- Keep controllers focused on HTTP handling.
- Keep business logic in services.
- Keep the shared database client in `src/prisma/`.
- Keep the schema and migrations in the root `prisma/` directory.

### Git workflow

1. Pull the latest changes from the shared branch.
2. Create a feature branch.
3. Make a focused change.
4. Run the application, tests, and linter.
5. Commit with a meaningful message.
6. Push the branch and open a pull request.
7. Review before merging.

Example branch names:

```text
feature/users-crud
feature/products-crud
fix/user-validation
docs/update-readme
```

Example commit messages:

```text
feat: add user creation endpoint
fix: handle missing users
docs: improve setup instructions
```

### Database collaboration

- Commit `prisma/schema.prisma` and migration files.
- Do not edit migrations that have already been shared or applied by teammates; create a new migration for subsequent changes.
- When pulling schema changes, install dependencies and apply migrations as instructed by the team.
- Coordinate schema changes and resolve conflicts before merging.
- Never commit `.env` or real credentials.
- Use a separate development database; do not experiment against production.

## 10. Troubleshooting

### DBeaver cannot connect

- Confirm MySQL Server is installed and running.
- Confirm host `localhost` and port `3306` are correct.
- Verify your username and password.
- If DBeaver requests a driver download, allow it to download the MySQL driver.
- If port `3306` is already in use, check which service is using it and confirm the configured MySQL port.

### `npx prisma migrate dev` cannot connect

- Confirm MySQL is running.
- Check `DATABASE_URL` in `.env`.
- Confirm the database `nest_crud` exists.
- Check that the user has permission to access the database.
- URL-encode special characters in the password.

### Prisma Client import or generation errors

Run:

```bash
npx prisma generate
```

Check that the `output` path in `schema.prisma` matches the import used by `PrismaService`. If package versions have changed, reinstall dependencies from the committed lockfile and regenerate the client.

### Port 3000 is already in use

Stop the other development server or configure your NestJS application to use a different port.

## 11. Definition of done

- [ ] A teammate can follow this README on Windows or macOS.
- [ ] MySQL is running locally or a shared development database is accessible.
- [ ] DBeaver connects successfully.
- [ ] The `nest_crud` database exists.
- [ ] Prisma Client generates successfully.
- [ ] Migrations create the expected tables.
- [ ] All five Users CRUD endpoints work.
- [ ] Request validation and error handling are implemented.
- [ ] Tests and linting pass.
- [ ] Secrets are excluded from Git.
- [ ] The team follows the same folder structure and migration workflow.

## Learning goal

Understand the request lifecycle:

### **HTTP Request → Controller → Service → Prisma Client → MySQL → HTTP Response**

Once the team understands this flow, add more features using the same conventions. Keep the architecture simple until real requirements justify changing it.
