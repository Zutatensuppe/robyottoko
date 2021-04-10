# Robyottoko - Twitch bot

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
