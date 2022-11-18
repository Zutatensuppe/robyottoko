# Robyottoko - Twitch Bot

![ci](https://github.com/Zutatensuppe/robyottoko/actions/workflows/ci.yaml/badge.svg)

Robyottoko provides an interface for your twitch bots.

Features are:

- Respond to twitch chat or channel reward redemptions with:
  - static text
  - countdown
  - playing a sound
  - playing a twitch clip
  - showing an image
  - translation of words (via dict.cc and jisho.org)
  - text returned from custom api
- Song requests via youtube
  - up/down vote per song
  - styleable via custom css
  - songs skippable, removable via chat or via interface
- Speech to text, which can turn your voice into combinations of:
  - subtitles
  - translated subtitles
  - synthesized voice
  - synthesized translated voice
- Let viewers draw on stream (requires a public url)
- Pomodoro widget
- Create customizable avatars/PNG-Tubers that move the mouth when you speak
  - The included example "Hyottoko-Chan" is made by [LisadiKaprio](https://www.artstation.com/lisadikaprio). Thank you!

Note: You will need your own bot account on twitch.tv for using
robyottoko, or use the [hyottoko.club](https://hyottoko.club) website,
which lets you use the features without setting the bot up yourself.

## Getting Started

1. Launch the database. By default the database will be exposed on localhost port 5434.

    ```console
    npm run dev-services
    ```

2. Create a `config.json`. The example can be copied, for some
features you have to provide an api key directly in the config atm.

    ```shell
    cp config.json.example config.json
    ```

3. Install the dependencies

    ```shell
    npm ci
    ```

4. Build (optional, only required if you made code changes)

    ```shell
    npm run build
    ```

5. Run the bot

    ```shell
    npm run bot
    ```

    This should output the url of the server, like this:

    ```shell
    [WebServer.ts] server running on http://localhost:1337
    ```

    Open the url and login as the user that was created in step 2.
    Go to `settings` in the menu, then fill in the twitch bot credentials and add twitch channels where it should operate in.

    Note: It is recommended that the bot you set there is also made a
    moderator in the twitch channels, so that it can chat without
    restrictions (for example for countdown commands).
