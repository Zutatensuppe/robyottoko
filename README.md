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
    ./run create-user
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

# Features

Some more information about different features:

## Song Request

Song request provides its own chat commands and defines who can use them:

Chat command     | Viewer | Mod | Explanation
-----------------|--------|-----|---------------------------------------
`!sr <SEARCH>`       | ✔  | ✔   | Search for `<SEARCH>` at youtube (by id or by title) and queue the first result in the playlist (after the first found batch of unplayed songs). <br /> This only executes if `<SEARCH>` does not match one of the commands below.
`!sr undo`           | ✔  | ✔   | Remove the song that was last added by oneself
`!sr current`        | ✔  | ✔   | Show what song is currently playing
`!sr good`           | ✔  | ✔   | Vote the current song up
`!sr bad`            | ✔  | ✔   | Vote the current song down
`!sr stats`          | ✔  | ✔   | Show stats about the playlist
`!sr stat`           | ✔  | ✔   | Alias for stats
`!sr rm`             | ✖  | ✔   | Remove the current song from the playlist
`!sr next`           | ✖  | ✔   | Skip to the next song
`!sr prev`           | ✖  | ✔   | Skip to the previous song
`!sr skip`           | ✖  | ✔   | Alias for next
`!sr jumptonew`      | ✖  | ✔   | Jump to the next unplayed song
`!sr shuffle`        | ✖  | ✔   | Shuffle the playlist (current song unaffected). <br /> Non-played and played songs will be shuffled separately and non-played songs will be put after currently playing song.
`!sr resetStats`     | ✖  | ✔   | Reset all statistics of all songs
`!sr clear`          | ✖  | ✔   | Clear the playlist
`!sr pause`          | ✖  | ✔   | Pause currently playing song
`!sr unpause`        | ✖  | ✔   | Unpause currently paused song
`!sr loop`           | ✖  | ✔   | Loop the current song
`!sr noloop`         | ✖  | ✔   | Stop looping the current song
`!sr unloop`         | ✖  | ✔   | Alias for noloop
`!sr hidevideo`      | ✖  | ✔   | Hide video for current song
`!sr showvideo`      | ✖  | ✔   | Show video for current song
`!sr tag <TAG>`      | ✖  | ✔   | Add tag `<TAG>` to the current song
`!sr rmtag <TAG>`    | ✖  | ✔   | Remove tag `<TAG>` from the current song
`!sr filter [<TAG>]` | ✖  | ✔   | Play only songs with the given tag `<TAG>`. If no tag is given, play all songs.
