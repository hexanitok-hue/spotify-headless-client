import express from "express";
import * as player from "./components/player";
import * as auth from "./components/auth";

const port = Number(process.env.PORT) || 8080;

const app = express();

// Authentication
app.get("/auth/login", auth.login);

// Authentication callback
app.get("/auth/callback", async (req, res) => {
  try {
    await auth.loginCallback(req);
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Front page
app.get("/", (req, res) => {
  if (!auth.ready()) {
    res.redirect("/auth/login");
  } else {
    player.connect(auth.token);
    //res.send(`Successfully authenticated, you can close this page`);
    res.sendFile(__dirname + "/templates/control.html");
  }
});

// Player page, used by Puppeteer
app.get("/play", (req, res) => res.sendFile(__dirname + "/player.html"));

// Control player
app.post("/api/play-pause", (req, res) => {
  player.playPause();
  res.sendStatus(204);
});
app.post("/api/next", (req, res) => {
  player.nextTrack();
  res.sendStatus(204);
});
app.post("/api/prev", (req, res) => {
  player.prevTrack();
  res.sendStatus(204);
});
app.get("/api/status", async (req, res) => {
  res.json(await player.status());
});
app.post("/api/reset", (req, res) => {
  player.reset();
  res.sendStatus(204);
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

// If authenticated, connect automatically
if (auth.ready()) {
  player.connect(auth.token);
} else {
  console.log(
    `Authentication required, visit http://localhost:${port} using your browser`
  );
}
