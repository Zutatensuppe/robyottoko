
todo: improve! XD

1. adjust config

    ```
    cp src/config.js.example src/config.js
    ```

2. create database

    ```
    node scripts/patch-db.js
    ```

3. create a user

    edit user in the script, then execute the
    script (or just add the user in the database directly)

    ```
    node scripts/create-user.js
    ```
