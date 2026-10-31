import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import {
  appendSession,
  createProfile,
  deleteProfile,
  emptyState,
  getActiveProfile,
  loadState,
  newId,
  saveState,
  switchProfile,
} from './src/storage';
import {
  analyzeWritten,
  generateScenarios,
  remainingScenarioCount,
  scenarioKeysUsed,
} from './src/scenarios';
import { computeScores } from './src/scoring';

const COLORS = {
  accent: '#1d4f91',
  accentSoft: '#e8eff8',
  background: '#ffffff',
  text: '#2b2f36',
  muted: '#6b7280',
  border: '#dde2ea',
  track: '#eef1f5',
  danger: '#b42318',
};

const SESSION_SIZES = [3, 5, 10, 15];
const CONFIDENCE_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
const DISCLAIMER =
  'Values is a self-reflection tool. It is not a clinical or validated psychological assessment.';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------------------------------------------------------------------------
// App: owns the saved state and decides which screen to show.
// ---------------------------------------------------------------------------

export default function App() {
  const [appState, setAppState] = useState(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [screen, setScreen] = useState('profiles');
  const [sessionSize, setSessionSize] = useState(3);
  // The session in progress. It is only saved to the profile when the last scenario is answered.
  const [run, setRun] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoadError(null);
    loadState()
      .then((state) => {
        setAppState(state);
        if (getActiveProfile(state)) setScreen('home');
        setLoaded(true);
      })
      // If loading fails, do not fall back to empty data: the next save would overwrite it.
      .catch((err) => setLoadError(err));
  }

  const activeProfile = getActiveProfile(appState);

  // Every change goes through here so state and storage stay in step.
  function commit(nextState) {
    setAppState(nextState);
    saveState(nextState).catch(() =>
      Alert.alert('Could not save', 'Your latest change was not saved. Please try again.')
    );
  }

  function handleCreate(name) {
    commit(createProfile(appState, name));
  }

  function handleOpen(id) {
    commit(switchProfile(appState, id));
    setScreen('home');
  }

  function handleDelete(profile) {
    Alert.alert(
      'Delete profile?',
      `"${profile.name}" and all of its sessions will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => commit(deleteProfile(appState, profile.id)),
        },
      ]
    );
  }

  async function handleStart() {
    if (!activeProfile) return;
    const used = scenarioKeysUsed(activeProfile.sessions);
    const scenarios = await generateScenarios(sessionSize, used);
    if (scenarios.length < sessionSize) {
      Alert.alert('Not enough new scenarios', 'Choose a smaller session.');
      return;
    }
    setRun({
      id: newId('ses'),
      profileId: activeProfile.id,
      date: new Date().toISOString(),
      scenarios,
      index: 0,
      responses: [],
    });
    setScreen('session');
  }

  function handleAnswer(response) {
    const responses = [...run.responses, response];
    const isLast = run.index + 1 >= run.scenarios.length;

    if (!isLast) {
      setRun({ ...run, index: run.index + 1, responses });
      return;
    }

    const session = { id: run.id, date: run.date, scenarios: run.scenarios, responses };
    commit(appendSession(appState, run.profileId, session));
    setRun(null);
    setScreen('results');
  }

  function handleLeave() {
    Alert.alert('Leave this session?', 'Answers from this session will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          setRun(null);
          setScreen('home');
        },
      },
    ]);
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <Centered>
          <Text style={styles.title}>Could not load your data</Text>
          <Text style={styles.body}>Your saved profiles are safe. Try loading again.</Text>
          <Button label="Try again" onPress={loadData} />
        </Centered>
      </SafeAreaView>
    );
  }

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <Centered>
          <ActivityIndicator color={COLORS.accent} />
        </Centered>
      </SafeAreaView>
    );
  }

  // Home, session and results all need an active profile. Without one, show profiles.
  const showProfiles = screen === 'profiles' || !activeProfile;

  const homeScreen = (
    <HomeScreen
      profile={activeProfile}
      sessionSize={sessionSize}
      remaining={activeProfile ? remainingScenarioCount(activeProfile.sessions) : 0}
      onSizeChange={setSessionSize}
      onStart={handleStart}
      onResults={() => setScreen('results')}
      onSwitch={() => setScreen('profiles')}
    />
  );

  let body;
  if (showProfiles) {
    body = (
      <ProfilesScreen
        profiles={appState.profiles}
        activeId={appState.activeId}
        onCreate={handleCreate}
        onOpen={handleOpen}
        onDelete={handleDelete}
      />
    );
  } else if (screen === 'session' && run) {
    const scenario = run.scenarios[run.index];
    body = (
      <SessionScreen
        key={scenario.id}
        scenario={scenario}
        index={run.index}
        total={run.scenarios.length}
        onAnswer={handleAnswer}
        onLeave={handleLeave}
      />
    );
  } else if (screen === 'results') {
    body = <ResultsScreen profile={activeProfile} onBack={() => setScreen('home')} />;
  } else {
    body = homeScreen;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {body}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function ProfilesScreen({ profiles, activeId, onCreate, onOpen, onDelete }) {
  const [name, setName] = useState('');
  const canCreate = name.trim().length > 0;

  function submit() {
    if (!canCreate) return;
    onCreate(name);
    setName('');
  }

  return (
    <Screen title="Profiles" subtitle="Each profile keeps its own sessions and results.">
      {profiles.length === 0 ? (
        <EmptyState text="No profiles yet. Create one below to begin." />
      ) : (
        profiles.map((profile) => (
          <Card key={profile.id}>
            <Text style={styles.cardTitle}>
              {profile.name}
              {profile.id === activeId ? '  ·  active' : ''}
            </Text>
            <Text style={styles.muted}>{plural(profile.sessions.length, 'session')}</Text>
            <View style={styles.row}>
              <Button label="Open" onPress={() => onOpen(profile.id)} style={styles.grow} />
              <Button label="Delete" variant="danger" onPress={() => onDelete(profile)} />
            </View>
          </Card>
        ))
      )}

      <Card>
        <Text style={styles.label}>New profile</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={COLORS.muted}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Button label="Create profile" onPress={submit} disabled={!canCreate} />
      </Card>
    </Screen>
  );
}

function HomeScreen({ profile, sessionSize, remaining, onSizeChange, onStart, onResults, onSwitch }) {
  const exhausted = remaining === 0;
  const tooLarge = sessionSize > remaining;
  return (
    <Screen title={profile.name} subtitle="Active profile">
      <Card>
        <Text style={styles.label}>Scenarios in this session</Text>
        <View style={styles.row}>
          {SESSION_SIZES.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={n === sessionSize}
              disabled={n > remaining}
              onPress={() => onSizeChange(n)}
            />
          ))}
        </View>
        <Text style={styles.muted}>
          {exhausted
            ? 'You have seen every scenario available to this profile.'
            : `${plural(remaining, 'new scenario')} left for this profile. A scenario is never shown twice.`}
        </Text>
        <Button
          label="Start session"
          onPress={onStart}
          disabled={exhausted || tooLarge}
        />
        {tooLarge && !exhausted ? (
          <Text style={styles.muted}>Choose a session of {remaining} or fewer.</Text>
        ) : null}
      </Card>

      <Button label="View my results" variant="secondary" onPress={onResults} />
      <Button label="Switch profile" variant="secondary" onPress={onSwitch} />
      <Disclaimer />
    </Screen>
  );
}

function SessionScreen({ scenario, index, total, onAnswer, onLeave }) {
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  function pickOption(option) {
    onAnswer({
      scenarioId: scenario.id,
      type: 'choice',
      text: option.text,
      tags: option.tags,
    });
  }

  async function submitWritten() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const tags = await analyzeWritten(text);
      onAnswer({ scenarioId: scenario.id, type: 'written', text, tags });
    } catch (err) {
      setBusy(false);
      Alert.alert('Could not analyse your answer', 'Please try again.');
    }
  }

  return (
    <Screen title={`Scenario ${index + 1} of ${total}`}>
      <ProgressBar value={index / total} />

      <Card>
        <Text style={styles.cardTitle}>{scenario.title}</Text>
        <Text style={styles.body}>{scenario.text}</Text>
      </Card>

      {writing ? (
        <Card>
          <Text style={styles.label}>Your response</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Describe what you would do and why"
            placeholderTextColor={COLORS.muted}
            multiline
            textAlignVertical="top"
            editable={!busy}
          />
          <Button
            label={busy ? 'Saving…' : 'Submit'}
            onPress={submitWritten}
            disabled={!draft.trim() || busy}
          />
          <Button
            label="Back to options"
            variant="secondary"
            onPress={() => setWriting(false)}
            disabled={busy}
          />
        </Card>
      ) : (
        <>
          {scenario.options.map((option, i) => (
            <Button
              key={i}
              label={option.text}
              variant="secondary"
              onPress={() => pickOption(option)}
            />
          ))}
          <Button label="Write my own response" variant="text" onPress={() => setWriting(true)} />
        </>
      )}

      <Button label="Leave session" variant="text" onPress={onLeave} />
    </Screen>
  );
}

function ResultsScreen({ profile, onBack }) {
  const scores = computeScores(profile.sessions);
  const hasResponses = scores.responseCount > 0;

  return (
    <Screen title="My results" subtitle={profile.name}>
      <Text style={styles.muted}>
        {plural(scores.responseCount, 'response')} across {plural(profile.sessions.length, 'session')}.
      </Text>

      {!hasResponses ? (
        <EmptyState text="No results yet. Complete a session to see your values and philosophies." />
      ) : (
        <>
          <Card>
            <Text style={styles.cardTitle}>Summary</Text>
            <SummaryLine heading="Leading values" items={scores.values.slice(0, 3)} />
            <SummaryLine heading="Leading philosophies" items={scores.philosophies.slice(0, 3)} />
            <SummaryLine heading="Leading morals" items={scores.morals.slice(0, 3)} />
          </Card>
          <RankingCard title="Values" items={scores.values} />
          <RankingCard title="Philosophies" items={scores.philosophies} />
          <RankingCard title="Morals" items={scores.morals} />
        </>
      )}

      <Button label="Back to home" variant="secondary" onPress={onBack} />
      <Disclaimer />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function Screen({ title, subtitle, children }) {
  return (
    <KeyboardAvoidingView
      style={styles.grow}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Centered({ children }) {
  return <View style={[styles.grow, styles.centered]}>{children}</View>;
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function EmptyState({ text }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

function Disclaimer() {
  return <Text style={styles.disclaimer}>{DISCLAIMER}</Text>;
}

const BUTTON_VARIANTS = {
  primary: { box: { backgroundColor: COLORS.accent }, text: { color: '#ffffff' } },
  secondary: {
    box: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.accent },
    text: { color: COLORS.accent },
  },
  danger: {
    box: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.danger },
    text: { color: COLORS.danger },
  },
  text: { box: { backgroundColor: 'transparent' }, text: { color: COLORS.accent } },
};

function Button({ label, onPress, variant = 'primary', disabled = false, style }) {
  const palette = BUTTON_VARIANTS[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.button, palette.box, disabled && styles.disabled, style]}
    >
      <Text style={[styles.buttonText, palette.text]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, selected, disabled = false, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.disabled]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Bar({ percent }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

function ProgressBar({ value }) {
  return <Bar percent={Math.round(value * 100)} />;
}

function SummaryLine({ heading, items }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.label}>{heading}</Text>
      <Text style={styles.body}>
        {items.length === 0
          ? 'Not enough data yet.'
          : items.map((item) => `${item.label} ${item.percent}%`).join('  ·  ')}
      </Text>
    </View>
  );
}

function RankingCard({ title, items }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>No {title.toLowerCase()} detected yet.</Text>
      ) : (
        items.map((item, i) => <ScoreRow key={item.id} rank={i + 1} item={item} />)
      )}
    </Card>
  );
}

function ScoreRow({ rank, item }) {
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreLabel}>
          {rank}. {item.label}
        </Text>
        <Text style={styles.scorePercent}>{item.percent}%</Text>
      </View>
      <Bar percent={item.percent} />
      <Text style={styles.muted}>
        {CONFIDENCE_LABEL[item.confidence]} confidence · {plural(item.evidence, 'response')}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  grow: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 16, gap: 12 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  title: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 15, color: COLORS.muted, marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  body: { fontSize: 16, lineHeight: 23, color: COLORS.text },
  muted: { fontSize: 14, color: COLORS.muted },
  disclaimer: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 8 },

  card: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  emptyState: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  button: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.4 },

  chip: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  chipText: { fontSize: 16, fontWeight: '600', color: COLORS.muted },
  chipTextSelected: { color: COLORS.accent },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  multiline: { minHeight: 160 },

  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.track,
    overflow: 'hidden',
  },
  fill: { height: 10, borderRadius: 5, backgroundColor: COLORS.accent },

  summaryLine: { gap: 4 },
  scoreRow: { gap: 6, marginTop: 4 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  scorePercent: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
});
