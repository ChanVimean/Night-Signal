# Build a Story API with NestJS, Prisma, and MySQL

This is a from-scratch tutorial. Start with an empty NestJS application, connect it to a MySQL/MariaDB database, add a `Story` model, wire the database client into a NestJS feature, then test the finished CRUD API with Thunder Client.

You will learn this request path:

```text
HTTP request -> Controller -> Service -> Prisma Client -> MySQL/MariaDB
```

The code shown here reflects this project: NestJS 12, Prisma 7, the MariaDB adapter, TypeScript ES modules, and a generated client inside `src/`.

## 1. Install the prerequisites

Install:

- **Node.js 20 or newer** and npm: [nodejs.org](https://nodejs.org/)
- **MySQL or MariaDB Server**: this is the database that stores rows
- **DBeaver Community** (optional): a graphical client for connecting to the database: [dbeaver.io](https://dbeaver.io/download/)
- **Visual Studio Code** and its **Thunder Client** extension for API requests
- **Nest CLI** in the next step

Check Node and npm:

```bash
node --version
npm --version
```

Start your MySQL/MariaDB server. The standard local port is `3306`.

## 2. Create the NestJS application

Install the Nest CLI and create a new project:

```bash
npm install --global @nestjs/cli
nest new nightsignal
cd nightsignal
```

Choose npm when the CLI asks which package manager to use. Start the starter app once to see the baseline:

```bash
npm run start:dev
```

Nest normally listens at `http://localhost:3000`. Stop it with `Ctrl+C` before continuing. From here on, run commands in the `nightsignal` project directory.

This tutorial uses the same ES module style as this project. In `package.json`, set the top-level module type:

```json
{
  "type": "module"
}
```

Merge that property into the existing JSON; do not replace the file. In `tsconfig.json`, set these compiler options (keep the other options Nest generated):

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src"
  }
}
```

With NodeNext module resolution, use `.js` suffixes in relative TypeScript imports, as shown in the files below.

## 3. Prepare the database with DBeaver

DBeaver is a client; it does not install or run MySQL/MariaDB. Make sure the database server is running first.

1. In DBeaver, select **New Database Connection**, then choose **MySQL**.

   ![Create a DBeaver connection](docs/images/dbeaver-new-connection.png)

2. Enter the server **Host** (usually `localhost`), **Port** (`3306`), and your database username and password. Leave the database field empty for this first connection.

   ![Enter MySQL connection settings](docs/images/dbeaver-mysql-settings.png)

3. Click **Test Connection**. If DBeaver asks to download the MySQL driver, allow it, then test again and finish creating the connection.

   ![Test the DBeaver connection](docs/images/dbeaver-test-connection.png)

4. Open a SQL editor for that connection and create the project database:

   ```sql
   CREATE DATABASE nightsignal_db;
   ```

   ![Create the NightSignal database](docs/images/dbeaver-create-database.png)

5. Refresh the database tree. It should show `nightsignal_db`; it is empty until Prisma creates tables in Step 6.

The account used by the app needs access to this database and permission to create or update tables. If connection setup fails, check that MySQL/MariaDB is running and verify the host, port, and credentials.

## 4. Add Prisma 7 and configure the connection

Install Prisma 7 and its MySQL/MariaDB adapter packages:

```bash
npm install --save-dev prisma@7
npm install @prisma/client@7 @prisma/adapter-mariadb mariadb dotenv @nestjs/config
```

Create a root `.env` file:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/nightsignal_db"
```

Replace `USER` and `PASSWORD` with your database credentials. URL-encode reserved characters in passwords, such as `@`, `:`, `/`, or `#`. Do not commit `.env` or put real credentials into source code.

### Configure the Prisma CLI

Create `prisma7.config.ts` at the project root. Prisma CLI uses this file to load the schema, migration folder, and database URL:

```typescript
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
```

### Define the database models

Create `prisma/schema.prisma`. The generator output is deliberately under `src/`: TypeScript's `rootDir` is `src`, so importing generated TypeScript from outside that folder causes a `TS6059` error.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
}

model Story {
  id          Int      @id @default(autoincrement())
  title       String   @db.VarChar(200)
  slug        String   @unique @db.VarChar(220)
  summary     String?  @db.VarChar(500)
  content     String   @db.Text
  location    String?  @db.VarChar(200)
  isTrueStory Boolean  @default(false)
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([title])
  @@index([isPublished, createdAt])
  @@map("ghost_stories")
}
```

The Prisma model is named `Story`; `@@map` makes its physical table name `ghost_stories`. The unique `slug` lets the API identify a story with a readable URL-like key as well as its numeric ID.

Create and apply the initial migration, then generate Prisma Client:

```bash
npx prisma migrate dev --config prisma7.config.ts --name init
npx prisma generate --config prisma7.config.ts
```

The migration creates the table in `nightsignal_db`. Client generation creates `src/generated/prisma/`; rerun it whenever you change the schema. Do not hand-edit generated files.

## 5. Wire Prisma into NestJS

Create `src/prisma/prisma.service.ts`. A Nest service is an injectable provider; this one owns the Prisma client and connects when the application starts:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaMariaDb(process.env['DATABASE_URL']!);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

The import must point to the generated client. `@prisma/client` is not the right import for this custom generator output.

Create `src/prisma/prisma.module.ts` to register and export the shared service:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Add `ConfigModule` and `PrismaModule` to the imports in `src/app.module.ts` (keep any other imports created by your app):

```typescript
ConfigModule.forRoot({ isGlobal: true }),
PrismaModule,
```

`ConfigModule` loads `.env` for Nest. `PrismaModule` provides the database service to feature modules. It is global, so a feature can inject `PrismaService` without constructing another client.

## 6. Create the Stories feature

Nest separates HTTP handling from application logic. Generate the feature module, controller, and service:

```bash
nest generate module modules/stories
nest generate controller modules/stories
nest generate service modules/stories
```

The module groups the controller and service. In `src/modules/stories/stories.module.ts`, register them:

```typescript
@Module({
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
```

Import `StoriesModule` in the `imports` array in `src/app.module.ts`. This makes Nest register the `/stories` routes when it starts.

### Define request DTOs

Create `src/modules/stories/dto/create-story.dto.ts`:

```typescript
export class CreateStoryDto {
  title!: string;
  slug!: string;
  content!: string;
  summary?: string | null;
  location?: string | null;
  isTrueStory?: boolean;
  isPublished?: boolean;
}
```

Create `src/modules/stories/dto/update-story.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateStoryDto } from './create-story.dto.js';

export class UpdateStoryDto extends PartialType(CreateStoryDto) {}
```

The create DTO describes the accepted body fields. `PartialType` makes those same fields optional for a partial `PATCH` request.

### Map HTTP routes in the controller

In `stories.controller.ts`, use decorators to map HTTP methods and route parameters to service calls:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateStoryDto } from './dto/create-story.dto.js';
import { UpdateStoryDto } from './dto/update-story.dto.js';
import { StoriesService } from './stories.service.js';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  create(@Body() dto: CreateStoryDto) {
    return this.storiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.storiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.storiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoryDto,
  ) {
    return this.storiesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.storiesService.remove(id);
  }
}
```

Add imports for the Nest decorators and DTO/service classes at the top of the file. `ParseIntPipe` rejects IDs that are not integers before calling the service.

### Put database operations in the service

Inject `PrismaService` into `StoriesService`. Use its generated `story` model methods for database work:

```typescript
import { Injectable } from '@nestjs/common';
import { CreateStoryDto } from './dto/create-story.dto.js';
import { UpdateStoryDto } from './dto/update-story.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoryDto) {
    return await this.prisma.story.create({ data: dto });
  }

  async findAll() {
    return await this.prisma.story.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.story.findUnique({ where: { id } });
  }

  async update(id: number, dto: UpdateStoryDto) {
    return await this.prisma.story.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return await this.prisma.story.delete({ where: { id } });
  }
}
```

The project's `StoriesService` adds request checks and converts common Prisma errors into HTTP errors: missing records return `404`, duplicate slugs return `409`, and invalid or empty request fields return `400`. The controller stays focused on HTTP; the service owns application behavior and database calls.

## 7. Run the completed API

Start the MySQL/MariaDB server, confirm `.env` points to `nightsignal_db`, then run Nest in development mode:

```bash
npm run start:dev
```

The server prints `http://localhost:3000`. If Nest exits during startup, check the database connection and ensure Step 5's migration and client generation completed.

## 8. Test the result with Thunder Client

Open Thunder Client in VS Code and create requests against `http://localhost:3000`. Choose **Body > JSON** for POST and PATCH requests.

### Create: `POST /stories`

Send to `http://localhost:3000/stories`:

```json
{
  "title": "The Light at Blackwater Pier",
  "slug": "light-at-blackwater-pier",
  "content": "A keeper reported seeing a lantern move across the closed pier.",
  "summary": "A strange light appears on a closed pier.",
  "location": "Blackwater Pier",
  "isTrueStory": false,
  "isPublished": true
}
```

The response contains the created story, including its generated ID and timestamps. Required fields are `title`, `slug`, and `content`. The optional boolean fields default to `false`.

### List: `GET /stories`

Send a GET request to `http://localhost:3000/stories`. You should receive an array containing the story you created.

### Read one: `GET /stories/:id`

Use the ID from the create response. For example, `GET http://localhost:3000/stories/1` returns that story. An unknown ID returns `404 Not Found`.

### Update: `PATCH /stories/:id`

Send to `http://localhost:3000/stories/1` with only the fields to change:

```json
{
  "isPublished": false,
  "summary": "Updated summary"
}
```

At least one field is required. The response contains the updated story.

### Delete: `DELETE /stories/:id`

Send `DELETE http://localhost:3000/stories/1`. The response contains the deleted story. The database row is removed.

Refresh `nightsignal_db` in DBeaver and open the `ghost_stories` table to inspect the same records Thunder Client created.

## How the full request works

For a create request, these are the steps inside the application:

1. Thunder Client sends JSON to `POST /stories`.
2. Nest routes the request to `StoriesController.create()` because of `@Controller('stories')` and `@Post()`.
3. The controller passes the body DTO to `StoriesService.create()`.
4. The service validates the data and calls `this.prisma.story.create()`.
5. Prisma Client uses the MariaDB adapter and `DATABASE_URL` to insert a row into `ghost_stories`.
6. The created database record travels back through the service and controller as a JSON HTTP response.

GET, PATCH, and DELETE follow the same route -> controller -> service -> Prisma -> database path, using their corresponding Prisma operations.

## Useful commands

```bash
npm run start:dev
npm run build
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts --name describe_change
npx prisma studio --config prisma7.config.ts
```

## Troubleshooting

**`@prisma/client did not initialize yet`**  
Run `npx prisma generate --config prisma7.config.ts`, confirm the generator output is `../src/generated/prisma`, and confirm `PrismaService` imports `../generated/prisma/client.js`. Restart Nest.

**Generated client is outside TypeScript `rootDir`**  
The generated client belongs at `src/generated/prisma`. Set that output in `schema.prisma` and regenerate.

**Nest cannot connect to MySQL/MariaDB**  
Start the server, check that `nightsignal_db` exists, and verify `DATABASE_URL` and the account's privileges. Restart Nest after changing `.env`.

**Migration cannot create tables**  
Create the database in DBeaver first, then run the migration. The database account must have permission to create tables and indexes.

**Duplicate slug response**  
Every story slug is unique. Choose a new slug or update the existing story instead.
