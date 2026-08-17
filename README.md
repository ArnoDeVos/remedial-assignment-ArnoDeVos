# Buurtwacht

I chose the neighbourhood app option because it has a link with my workplace. I work at the IT-department of a local police zone. We have a project that is called "whatsapp buurtpreventiegroepen". In those groups people can declare suspicious activity etc in their neighbourhoods.
Residents register sightings of people they notice on the street. Everyone can then look at those records on a map and follow a single person's reconstructed trajectory through the neighbourhood.

## Features

- Residents register a sighting by clicking the spot on the neighbourhood map — no coordinates are ever typed.
- Subjects are pseudonymous: a generated reference code and a description of appearance, never a name or an address.
- Trajectory reconstruction connects a subject's sightings into a path, splitting it into legs where more than three hours pass between observations.
- A five-stage cleaning pipeline sanitises text, checks the timestamp and position, rejects duplicates and flags physically impossible movement.
- The district a sighting belongs to is derived server-side from the coordinates, so it cannot be claimed by the client.
- Activity visualisation: districts tinted by how busy they are, an hourly distribution and a contributor ranking, all aggregated in Postgres.
- A moderation queue where a moderator accepts or rejects flagged sightings — rejected rows are hidden, never deleted.
- JWT authentication with resident and moderator roles: reading the map is public, registering a sighting requires an account.

## Running it

**Requirements:** Docker and Docker Compose. 

```bash
git clone https://github.com/ArnoDeVos/remedial-assignment-ArnoDeVos
cd remedial-assignment-ArnoDeVos

# 1. Create the environment file. The defaults work as-is.
cp .env.template .env        # Windows: copy .env.template .env

# 2. Build and start everything.
docker compose up --build
```

Then open **<http://localhost:8080>**.

| Service    | URL                             | Notes                                |
| ---------- | ------------------------------- | ------------------------------------ |
| Web client | <http://localhost:8080>         | nginx, also proxies `/api`           |
| API        | <http://localhost:4000/api>     | Express                              |
| Postgres   | `localhost:5432`                | user/password/database from `.env`   |


## Demo accounts

Seeded on first boot. Password for all of them: `Buurtwacht!2026`

| E-mail                       | Name      | Zone         | Role      |
| ---------------------------- | --------- | ------------ | --------- |
| `lotte@buurtwacht.local`     | Lotte V.  | Mollem       | resident  |
| `samir@buurtwacht.local`     | Samir B.  | Zellik       | resident  |
| `joke@buurtwacht.local`      | Joke D.   | Bekkerzeel   | resident  |
| `peter@buurtwacht.local`     | Peter L.  | Relegem      | resident  |
| `nadia@buurtwacht.local`     | Nadia K.  | Kobbegem     | resident  |
| `moderator@buurtwacht.local` | Wijkagent | Asse-centrum | moderator |

Sign in as the moderator to see the review queue with the flagged sightings the
seed deliberately plants.

## API Endpoints

Below is a summary of the main API endpoints. All responses are in JSON.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/health` | Check whether the API is running |
| POST | `/api/auth/register` | Create a new resident account |
| POST | `/api/auth/login` | Sign in and receive a token |
| GET | `/api/auth/me` | Get the signed-in resident |
| GET | `/api/neighbourhood/map` | Get the map geometry (zones and streets) |
| GET | `/api/neighbourhood/activity` | Get activity totals per zone, hour and reporter |
| GET | `/api/neighbourhood/trajectories` | Get reconstructed paths for several subjects at once |
| GET | `/api/subjects` | Get all subjects |
| GET | `/api/subjects/{id}` | Get details of a specific subject |
| GET | `/api/subjects/{id}/trajectory` | Get the reconstructed path of a specific subject |
| GET | `/api/sightings` | Get all sightings |
| GET | `/api/sightings/summary` | Get counts of sightings, subjects and reporters |
| POST | `/api/sightings` | Register a new sighting (requires sign-in) |
| GET | `/api/sightings/review-queue` | Get all flagged sightings (moderator only) |
| PATCH | `/api/sightings/{id}/review` | Accept or reject a flagged sighting (moderator only) |

## Scources
- [Docker] (https://docs.docker.com/compose/) => reading the basics
- [ChatGPT] (https://chatgpt.com/share/6a80b63d-4aa4-83eb-b96c-8aed71824971) => helping setup docker for my project
- [ChatGPT] (https://chatgpt.com/share/6a80bd59-422c-83eb-8fe3-dfbc46d00a79) => setting up node and a healthcheck
- [ChatGPT] (https://chatgpt.com/share/6a80c5d4-7368-83ed-a111-c7fd7469874f) => setting up dockerfile for the frontend
- [ChatGPT] (https://chatgpt.com/share/6a80fbb8-f11c-83eb-b0aa-202d499c997b) => setting up a structured logger, environment module and knexjs
- [Vite] (https://vite.dev/guide/)
- [NGINX] (https://nginx.org/en/) => better understanding
- [KNEXJS] https://knexjs.org/guide/ => How to set it up
- [ChatGPT] (https://chatgpt.com/share/6a81aec8-a074-83eb-a89c-7dbaa1f3830d) => Making the math module of the map
- [ChatGPT] (https://chatgpt.com/share/6a81b9bd-d37c-83eb-87f9-4b7171283f47) => Making tables and fingerprint
- [GIT] (https://github.com/cprosche/mulberry32) => A fast, seedable, pseudo-random number generator for JavaScript.
- [ChatGPT] (https://chatgpt.com/share/6a81c4ec-8cbc-83eb-b08a-3b81c01852be) => Making functions in the simulated activity file
- [ChatGPT] (https://chatgpt.com/share/6a81d31e-557c-83eb-aab8-7b1cda11dd08) => Making geometry and fingerprint tests
- [ChatGPT] (https://chatgpt.com/share/6a81db0a-92f8-83eb-8982-7d002d144cbf) => Error handling
- [ChatGPT] (https://chatgpt.com/share/6a81de97-5f50-83ed-8fa5-2f2564b444e3) => Centralising error handling
- [ChatGPT] (https://chatgpt.com/share/6a81e1d3-17e4-83eb-adb1-5050725d1484) => Adding base repository, CRUD
- [ChatGPT] (https://chatgpt.com/share/6a81efb7-e91c-83ed-b9ea-656235626af3) => Adding repositories
- [ChatGPT] (https://chatgpt.com/share/6a81f23b-cba0-83eb-bd05-a8c91bd8e6bf) => Adding a translator for JSON, rows, columns
- [ZOD] (https://zod.dev/basics) => Validation 
- [ChatGPT] (https://chatgpt.com/share/6a81f613-5ca0-83eb-baf4-ec7d9848331e) => Validation
- [ChatGPT] (https://chatgpt.com/share/6a820daa-30b8-83eb-83a3-477b0784e866) => Cleaning pipeline and validation stages
- [ChatGPT] (https://chatgpt.com/share/6a821700-1e44-83ed-897b-afbacecc07bf) => Adding a subject & sighting service + sighting controller
- [ChatGPT] (https://chatgpt.com/share/6a821cd6-4768-83eb-8818-270151432d44) => Testing pipeline
- [ChatGPT] (https://chatgpt.com/share/6a821f33-e7f8-83eb-a322-7d50c55f63bb) => Adding a trajectory service to turn a list of sightings into a path + adding a neighbourhoodservice to serve the map geometry and layer the activity figures on it
- [ChatGPT] (https://chatgpt.com/share/6a82259e-ef38-83eb-8070-b63221ec8867) => Creation of neighbourhood and subjectcontroller
- [ChatGPT] (https://chatgpt.com/share/6a8226d6-bb5c-83eb-be9a-eb44a1c61004) => Creation of a trajectory test
- [ChatGPT] (https://chatgpt.com/share/6a8228e8-eae4-83eb-a4cc-1eb1352efd49) => Centralizing all repository and service construction
- [ChatGPT] (https://chatgpt.com/share/6a823310-c110-83ed-b4ef-11ce5a97851d) => Setting up an API router
- [ChatGPT] (https://chatgpt.com/share/6a823673-a27c-83eb-89c5-fc265e8ebf76) => Setting up an Express app and server
- [ChatGPT] (https://chatgpt.com/share/6a823e32-add8-83eb-87d8-97035e3dcd47) => Creating a frontend API client
- [ChatGPT] (https://chatgpt.com/share/6a823fe6-23fc-83ed-bf21-d07902ec2db3) => React authentication
- [ChatGPT] (https://chatgpt.com/share/6a82421a-d9c4-83eb-ad60-e81e1dd19140) => React hooks
- [ChatGPT] (https://chatgpt.com/share/6a824854-d3ac-83eb-9712-4c83b657d20a) => Add frontend formatting helpers, protected route handling and login and registration pages.
- [ChatGPT] (https://chatgpt.com/share/6a824d84-fcf0-83ed-95e9-ef55d83231c9) => Adds the subject overview and connects the main frontend routing and startup structure.
- [ChatGPT] (https://chatgpt.com/share/6a825296-9d5c-83eb-8ede-5bf97f692ade) => Added colour and shared time filters
- [ChatGPT] (https://chatgpt.com/share/6a8255c3-f1ac-83eb-908e-399db0d2668b) => Neighbourhood svg map
- [ChatGPT] (https://chatgpt.com/share/6a825880-9fd4-83eb-a464-959203a7ba88) => Add activity dashboard, selectable subject list and shared time-window filter
- [ChatGPT] (https://chatgpt.com/share/6a825a9a-76dc-83ed-8818-70820423efcd) => Registering sightings form
- [ChatGPT] (https://chatgpt.com/share/6a825d7d-db80-83eb-8894-6b9d2863c1a0) => Added interactive map page and subject trajectory detail view
- [ChatGPT] (https://chatgpt.com/share/6a82610d-a04c-83ed-be9e-a196b24467b0) => Added reviewpage
- Past tasks and courses
- DEV V course

## Licence
MIT — see [`LICENSE`](LICENSE).