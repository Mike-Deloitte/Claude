# Values

A self-reflection prototype built with Expo (React Native). Each session presents scenarios. You pick one of several responses or write your own. Responses are tagged against a fixed set of values and philosophies. Results show ranked values and philosophies, saved per profile.

> Values is a self-reflection tool. It is **not** a clinical or validated psychological assessment.

All data stays on the device (AsyncStorage). Nothing is sent anywhere in this build.

## Requirements

- Node 18+ (tested with Node 22)
- Expo Go on a phone, or an iOS/Android simulator

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` to open a simulator. The app is portrait-only.

## Try the main flow

1. Create two profiles, for example "Ana" and "Ben".
2. Open one, start a session (3 scenarios), and answer all three. Try "Write my own response" for at least one answer.
3. Open the other profile and do the same with different answers.
4. "View my results" on each. The rankings should differ.
5. Force-quit and reopen. Everything should still be there.

## Project structure

```
values-app/
  App.js            Screens (profiles, home, session, results) and shared components
  app.json          Expo config (portrait only)
  babel.config.js   babel-preset-expo
  package.json
  src/
    taxonomy.js     Fixed VALUES, PHILOSOPHIES, WRITTEN_WEIGHT, sanitizeTags()
    scenarios.js    generateScenarios(count) and analyzeWritten(text) - STUBS
    scoring.js      computeScores(sessions) -> { responseCount, values, philosophies }
    storage.js      load/save state; createProfile, switchProfile, deleteProfile, appendSession
```

## Data model

One AsyncStorage key, `values-app:v1`:

```js
{
  profiles: [
    {
      id, name, createdAt,
      sessions: [
        {
          id, date,
          scenarios: [{ id, title, text, options: [{ text, tags }] }],
          responses: [
            { scenarioId, type: 'choice' | 'written', text, tags: { [tagId]: 0..1 } }
          ]
        }
      ]
    }
  ],
  activeId
}
```

Tags are stored on each response at answer time, so the data can be re-scored later without asking the user again. The stored scenario copy is what makes that possible.

If the saved data cannot be parsed, it is copied to `values-app:v1:unreadable-backup` before the app starts fresh. The app never overwrites unreadable data silently. If loading fails for any other reason, the app shows a "Try again" screen instead of an empty list.

## Taxonomy

The ids are stored in user data. **Do not rename them.** Labels can change freely.

- Values: `fairness`, `loyalty`, `honesty`, `care`, `autonomy`, `achievement`, `tradition`, `security`
- Philosophies: `consequentialist`, `duty`, `virtue`, `egalitarian`
- Morals (moral foundations, after Haidt): `harm-care`, `reciprocity`, `ingroup-loyalty`, `authority`, `sanctity`, `liberty`

The moral ids are prefixed or distinct from the value ids, because every tag id must be unique across the taxonomy.

## Scoring rules (`src/scoring.js`)

- `raw[tag]` = sum over every response in every session of `weight × strength`.
- `weight` is `WRITTEN_WEIGHT` (1.5) for written answers and 1 for choices.
- Tags with strength 0, and unknown ids, are ignored entirely. They do not count as evidence.
- Values, philosophies, and morals are ranked separately. `percent = raw / total raw in that category`, rounded.
- Tags with a zero raw score are left out of the rankings.
- Confidence depends on evidence count, the number of responses tagged with that tag: 10 or more is **high**, 4 to 9 is **medium**, and fewer than 4 is **low**.

**Not yet implemented (TODO):** a consistency measure. Count the distinct scenarios that support each tag and factor that into confidence, so one scenario repeated many times does not read as "high". The TODO is in `scoring.js`.

## Stubs and the planned analysis endpoint

Both of these run locally today. Their signatures are async so a backend call can replace them without changing callers.

- `generateScenarios(count, excludeKeys)` draws up to `count` scenarios from the bank that are not in `excludeKeys`. Each scenario has a stable `key`. `scenarioKeysUsed(sessions)` lists the keys a profile has already seen, across all its sessions, so no scenario repeats within a profile. Every scenario gets a unique id and at least four options. Each scenario has at least one option that carries moral tags.
- `analyzeWritten(text)` does keyword matching. Each keyword hit adds 0.5 to a tag's strength, capped at 1. Matching is whole-word with common endings, so "career" does not match "care". It covers values, philosophies, and morals.

## The built-in scenario bank

`src/bank.js` holds 50 scenarios. Each has four responses, and each response is mapped to philosophies, values, and moral foundations with strengths from 0 to 1. Keys are `q01` to `q50`. Keep them stable: a key that changes would let a profile see that scenario again.

Earlier sessions saved with the previous 15 scenarios keep their answers and results. Their scenarios are no longer in the bank, so they do not reduce the remaining count.

## Generating new scenarios (optional)

When a profile has used all built-in scenarios, the app can ask the scenario server for new ones. Without the server, the profile stops at the built-in bank.

Run it on your own computer:

1. Start the server, with your AI key and a token of your choice:
   ```bash
   ANTHROPIC_API_KEY=your-key SCENARIO_TOKEN=some-long-random-string node server/scenario-server.mjs
   ```
   For testing without an AI key, use `MOCK_AI=1` instead of `ANTHROPIC_API_KEY`.
2. Find your computer's address on the Wi-Fi, for example `192.168.1.20`.
3. In `src/config.js`, set `url` to `http://192.168.1.20:8787` and `token` to the same token. Restart Expo.
4. Keep the server running while you use the app. Your phone and computer must be on the same Wi-Fi.

What the server does and does not do:

- The AI key stays on the computer. It is never in the app.
- The app sends only how many scenarios it needs and the titles the profile has already seen. It never sends the profile name or answers.
- The token is included in the app, so use a throwaway token for testing. It is not a secret from anyone who has the app.
- AI-generated scenarios are not reviewed by a person. Read a few before relying on them.
- The server is for local testing only. It is not hosted or secured for use by others.

The reply is checked on the server and again in the app. Scenarios with the wrong number of options, unknown tags, or no moral tag are dropped.

`sanitizeTags()` in `src/taxonomy.js` already drops unknown ids and clamps strengths, so responses from the server cannot inject unknown tags.

## Behaviour notes

- Launch goes to Home if an active profile exists, and to Profiles otherwise.
- Creating a profile does not change the active profile, except when there is none yet.
- Deleting the active profile makes the first remaining profile active. If none remain, no profile is active.
- A session is saved only when its last scenario is answered. "Leave session" discards it, and closing the app mid-session also discards it.
- Profile names are trimmed and limited to 40 characters.

## Limitations of the morals result

- Results come from the answers given in these scenarios only. They are not a measure of someone's moral character.
- Sessions saved before this change have no morals tags, so their morals ranking starts empty. They are not re-asked; only new sessions contribute.

## Known limitations

- The written-answer analysis is keyword matching and will miss a lot. Treat its tags as rough.
- The built-in bank holds fifty scenarios. Each profile gets each scenario once, across all its sessions. Once a profile has seen all fifty, it needs the scenario server (see below) to start another session.
- The `react-native` version is pinned to 0.76.5 as specified. `expo install --check` reports 0.76.9 as the SDK 52 expected version.
- `app.json` uses placeholder bundle identifiers (`com.example.values`). Change them before any store build. No icon or splash image is set.
- Verified by bundling for iOS and Android, running the Metro dev server, unit-testing the pure logic, and driving the UI in a browser harness. Not yet run on a physical device or simulator.
