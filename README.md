# Robyottoko - Twitch Bot

![ci](https://github.com/Zutatensuppe/robyottoko/actions/workflows/ci.yaml/badge.svg)

Robyottoko provides an interface for your twitch bots.

Features are:
- Respond to twitch chat with:
  - static text
  - countdown
  - playing a sound
  - showing an image
  - translation of words (via dict.cc and jisho.org)
  - text returned from custom api
- Song requests via youtube
  - up/down vote per song
  - songs skippable, removable via chat or via interface
- Speech to text, which can turn your voice into combinations of:
  - subtitles
  - translated subtitles
  - synthesized voice
  - synthesized translated voice
- Let viewers draw on stream (requires a public url)

Note: You will need your own bot account on twitch.tv for using
robyottoko. Alternatively you can ask in
the [discord channel](https://discord.gg/jrPSmmHhbE)
for an account on [hyottoko.club](https://hyottoko.club), which
would let you use all the features without setting anything up yourself.

## Getting Started

1. Create a `config.json`. The example can be copied, for some
features you have to provide an api key directly in the config atm.

    ```
    cp config.json.example config.json
    ```

2. Install the dependencies

    ```
    npm install
    ```

3. Create a user. You will be asked for a user name and password.
The rest of the settings can be changed via the bot admin ui.

    ```
    ./run ts scripts/create-user.ts
    ```

4. Run the bot

    ```
    ./run bot
    ```

    This should output the url of the server, like this:
    ```
    [WebServer.ts] server running on http://localhost:1337
    ```

    Open the url and login as the user that was created in step 2.
    Go to `settings` in the menu, then fill in the twitch bot credentials and add twitch channels where it should operate in.

    Note: It is recommended that the bot you set there is also made a
    moderator in the twitch channels, so that it can chat without
    restrictions (for example for countdown commands).
