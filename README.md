# Robyottoko - Twitch bot

Robyottoko provides an interface for your twitch bots.

Features are:
- Respond to twitch chat with:
  - static text
  - countdown
  - playing a sound
  - showing an image
  - jisho.org word lookup
  - text returned from custom api
- Song requests via youtube
  - up/down vote per song
  - songs skippable, removable via chat or via interface
- Speech to text, which can turn your voice into combinations of:
  - subtitles
  - translated subtitles
  - synthesized voice
  - synthesized translated voice

Note: You will need your own bot account on twitch.tv for using
robyottoko. Alternatively you can ask in
the [discord channel](https://discord.gg/jrPSmmHhbE)
for an account on [hyottoko.club](https://hyottoko.club), which
would let you use all the features without setting anything up yourself.

## Getting Started

1. Create a `src/config.js`. The example can be copied, for some
features you have to provide an api key directly in the config atm.

    ```
    cp src/config.js.example src/config.js
    ```

2. Install the dependencies

    ```
    npm install
    ```

3. Create a user. You will be asked for a user name and password.
The rest of the settings can be changed via the bot admin ui.

    ```
    ./run create-user
    ```

4. Run the bot

    ```
    ./run bot
    ```

    This should output the url of the server, like this:
    ```
    [WebServer.js] server running on http://localhost:1337
    ```

    Open the url and login as the user that was created in step 2.
    Go to `settings` in the menu, then fill in the twitch bot credentials and add twitch channels where it should operate in.

    Note: It is recommended that the bot you set there is also made a
    moderator in the twitch channels, so that it can chat without
    restrictions (for example for countdown commands).
