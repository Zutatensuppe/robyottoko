<template>
  <table class="table is-striped">
    <thead>
      <tr>
        <th>Chat command</th>
        <th>Viewer</th>
        <th>Mod</th>
        <th>Explanation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>!sr &lt;SEARCH&gt;</code></td>
        <td class="positive">✔</td>
        <td class="positive">✔</td>
        <td>
          Search for <code>&lt;SEARCH&gt;</code> at youtube (by id or by title)
          and queue the first result in the playlist (after the first found
          batch of unplayed songs).<br />
          This only executes if <code>&lt;SEARCH&gt;</code> does not match one
          of the commands below.
        </td>
      </tr>
      <tr>
        <td><code>!sr undo</code></td>
        <td class="positive">✔</td>
        <td class="positive">✔</td>
        <td>Remove the song that was last added by oneself.</td>
      </tr>
      <tr>
        <td><code>!sr current</code></td>
        <td class="positive">✔</td>
        <td class="positive">✔</td>
        <td>Show what song is currently playing</td>
      </tr>
      <tr>
        <td><code>!sr good</code></td>
        <td class="positive">✔</td>
        <td class="positive">✔</td>
        <td>Vote the current song up</td>
      </tr>
      <tr>
        <td><code>!sr bad</code></td>
        <td class="positive">✔</td>
        <td class="positive">✔</td>
        <td>Vote the current song down</td>
      </tr>
      <tr>
        <td><code>!sr stats</code></td>
        <td class="positive">✔</td>
        <td class="positive">✔</td>
        <td>Show stats about the playlist</td>
      </tr>
      <tr>
        <td><code>!sr stat</code></td>
        <td class="positive">✔</td>
        <td class="positive">✔</td>
        <td>Alias for stats</td>
      </tr>
      <tr>
        <td><code>!sr rm</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Remove the current song from the playlist</td>
      </tr>
      <tr>
        <td><code>!sr next</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Skip to the next song</td>
      </tr>
      <tr>
        <td><code>!sr prev</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Skip to the previous song</td>
      </tr>
      <tr>
        <td><code>!sr skip</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Alias for next</td>
      </tr>
      <tr>
        <td><code>!sr jumptonew</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Jump to the next unplayed song</td>
      </tr>
      <tr>
        <td><code>!sr shuffle</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>
          Shuffle the playlist (current song unaffected).
          <br />
          Non-played and played songs will be shuffled separately and non-played
          songs will be put after currently playing song.
        </td>
      </tr>
      <tr>
        <td><code>!sr resetStats</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Reset all statistics of all songs</td>
      </tr>
      <tr>
        <td><code>!sr clear</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Clear the playlist</td>
      </tr>
      <tr>
        <td><code>!sr pause</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Pause currently playing song</td>
      </tr>
      <tr>
        <td><code>!sr unpause</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Unpause currently paused song</td>
      </tr>
      <tr>
        <td><code>!sr loop</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Loop the current song</td>
      </tr>
      <tr>
        <td><code>!sr noloop</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Stop looping the current song</td>
      </tr>
      <tr>
        <td><code>!sr unloop</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Alias for noloop</td>
      </tr>
      <tr>
        <td><code>!sr hidevideo</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Hide video for current song</td>
      </tr>
      <tr>
        <td><code>!sr showvideo</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Show video for current song</td>
      </tr>
      <tr>
        <td><code>!sr tag &lt;TAG&gt;</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Add tag <code>&lt;TAG&gt;</code> to the current song</td>
      </tr>
      <tr>
        <td><code>!sr rmtag &lt;TAG&gt;</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>Remove tag <code>&lt;TAG&gt;</code> from the current song</td>
      </tr>
      <tr>
        <td><code>!sr filter [&lt;TAG&gt;]</code></td>
        <td class="negative">✖</td>
        <td class="positive">✔</td>
        <td>
          Play only songs with the given tag <code>&lt;TAG&gt;</code>. If no tag
          is given, play all songs.
        </td>
      </tr>
    </tbody>
  </table>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {},
});
</script>
