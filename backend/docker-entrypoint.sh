#!/bin/sh
node dist/infrastructure/initDb.js
exec node dist/app.js
