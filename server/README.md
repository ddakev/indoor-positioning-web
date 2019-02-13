A tiny webserver using express and websockets to test the web app

## How to use

 - run `npm install`, then `node server` in indoor-positioning-web/server/
 - edit indoor-positioning-web/src/config.js with your IPv4 address (run `ipcofing` to find out your IPv4)
 - make sure the React server is running; if not run `npm start` in indoor-positioning-web/

## What to expect

The server currently creates 100 random employees with randomly assigned equipment with random status and location each. When you run the app, you should see the dots on the right side move every once in a while.

## What you can reuse

See lines 9 through 25 to set up the websockets server. The rest sets up the express REST API and seeds random data to the React app.
