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

## Stubs and the planned backend

Both of these run locally today. Their signatures are async so a backend call can replace them without changing callers.

- `generateScenarios(count, excludeKeys)` draws up to `count` scenarios from the bank that are not in `excludeKeys`. Each scenario has a stable `key`. `scenarioKeysUsed(sessions)` lists the keys a profile has already seen, across all its sessions, so no scenario repeats within a profile. Every scenario gets a unique id and at least four options. Each scenario has at least one option that carries moral tags.
- `analyzeWritten(text)` does keyword matching. Each keyword hit adds 0.5 to a tag's strength, capped at 1. Matching is whole-word with common endings, so "career" does not match "care". It covers values, philosophies, and morals.

Planned replacement (not built):

- `POST /scenarios` with `{ count, excludeIds? }`, returning scenarios in the same shape, using only taxonomy ids.
- `POST /analyze` with `{ text, scenario }`, returning tag strengths using only taxonomy ids.

Rules for that backend:

- The AI API key lives only on the server. The app must never contain one.
- Only the scenario text and the user's written answer leave the device.
- Never send the profile name or other identifying details.

`sanitizeTags()` in `src/taxonomy.js` already drops unknown ids and clamps strengths, so responses from the backend cannot inject unknown tags.

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
- Scenarios come from a fixed bank of fifteen. Each profile gets each scenario once, across all its sessions. Once a profile has seen all fifteen, it cannot start another session until more scenarios are added.
- The `react-native` version is pinned to 0.76.5 as specified. `expo install --check` reports 0.76.9 as the SDK 52 expected version.
- `app.json` uses placeholder bundle identifiers (`com.example.values`). Change them before any store build. No icon or splash image is set.
- Verified by bundling for iOS and Android, running the Metro dev server, unit-testing the pure logic, and driving the UI in a browser harness. Not yet run on a physical device or simulator.
