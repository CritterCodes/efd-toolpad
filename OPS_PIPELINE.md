# Ops Pipeline

This repo (`efd-toolpad`, app `admin` in ecosystem `efd`) is wired into the ops v2 lead→verify pipeline: tasks are created and tracked via `ops task`, work happens on `ops/*` branches pushed to trigger Vercel previews, evidence (commits, previews) is attached via `ops evidence` / `ops preview`, and tasks move through `building` → `verify` → done as an admin/owner loop reviews and confirms each change.
