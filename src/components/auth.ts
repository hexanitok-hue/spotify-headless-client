import axios, { AxiosResponse } from "axios";
import dotenv from "dotenv";
import { Request, Response } from "express";
import fs from "fs";

// Client id and secret
dotenv.config();
const spotify_client_id: string = process.env.SPOTIFY_CLIENT_ID ?? "";
const spotify_client_secret: string = process.env.SPOTIFY_CLIENT_SECRET ?? "";

// Tokens
const filename = ".token.json";
const data = fs.existsSync(filename)
  ? JSON.parse(fs.readFileSync(filename, "utf-8"))
  : {};
let access_token: string = data.access_token ?? "";
let refresh_token: string = data.refresh_token ?? "";
let token_expiry: Date = new Date(data.token_expiry ?? 0);

// Login / get access token (from https://developer.spotify.com/documentation/web-playback-sdk/howtos/web-app-player)
const login = (req: Request, res: Response) => {
  const scope = "streaming user-read-private user-read-email";
  const state = Math.random().toString();
  console.log(`Redirect URL is https://${req.get("host")}/auth/callback`);

  const auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: spotify_client_id,
    scope: scope,
    redirect_uri: `https://${req.get("host")}/auth/callback`,
    state: state,
  });

  res.redirect(
    "https://accounts.spotify.com/authorize/?" +
      auth_query_parameters.toString()
  );
};

// Login callback
const loginCallback = async (req: Request) => {
  const code: string = (req.query.code as string) ?? "";

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    method: "post",
    data: new URLSearchParams({
      code: code,
      redirect_uri: `https://${req.get("host")}/auth/callback`,
      grant_type: "authorization_code",
    }),
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(spotify_client_id + ":" + spotify_client_secret).toString(
          "base64"
        ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  const response = await axios(authOptions);
  parseResponse(response);
  return { access_token, refresh_token };
};

const parseResponse = (response: AxiosResponse) => {
  access_token = response.data.access_token;

  if (response.data.refresh_token != undefined) {
    // Only update refresh token if it is returned
    refresh_token = response.data.refresh_token;
  }

  const expiryMilliseconds = response.data.expires_in * 1000;
  const date = new Date(response.headers.date);
  token_expiry = new Date(date.getTime() + expiryMilliseconds);
  fs.writeFileSync(
    filename,
    JSON.stringify({ access_token, refresh_token, token_expiry })
  );
};

const refreshToken = async () => {
  console.log("Refreshing token");
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    method: "post",
    data: new URLSearchParams({
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    }),
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(spotify_client_id + ":" + spotify_client_secret).toString(
          "base64"
        ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const response = await axios(authOptions);
  parseResponse(response);
};

const getToken = () => {
  if (refresh_token.length > 0 && new Date() > token_expiry) {
    refreshToken();
  } else if (access_token.length == 0 && refresh_token.length > 0) {
    refreshToken();
  }
  return access_token;
};

const ready = () => refresh_token != "";

export { login, loginCallback, getToken as token, ready };
