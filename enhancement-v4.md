## NE Dating – Enhancement v4

### 1. Goals

- Deepen **chatroom engagement** with interactive, playful features that reduce awkwardness and keep conversations flowing.
- Promote **group activities and new friendships** through lightweight group mechanics and social events.
- Reuse existing data (**MBTI, hobbies, red flags, events**) to keep implementation efficient and consistent.

---

## 2. Scope Overview

- **Chatroom Interactivity**
  1. Inline Polls in Chat
  2. Icebreaker Cards & Quick Games
  3. Smart Reply Templates (AI‑assisted)
  4. Conversation Milestones & Streaks

- **Group Activities & New Friends**
  5. Themed Group Rooms
  6. Event Group Chats
  7. Speed‑Friending Sessions
  8. Post‑Event “People You Met” Recommendations

Each feature below includes: description, UX flow, data model impact, and basic analytics.

---

## 3. Chatroom Interactivity

### 3.1 Inline Polls in Chat

**Description**

Allow users to insert a small poll directly into the chat (1–3 options). Participants can vote once; results update live.

**User Flow**

- In chat input area, user taps **“+” → “Create Poll”**.
- Modal: question text + up to 3 options.
- Sends a `poll` message bubble with:
  - Question
  - Options + % and vote counts
- Tapping an option records vote and animates result bar.

**Data Model**

- `ChatMessage` (new fields):
  - `type: 'poll'`
  - `poll?: { question: string; options: { id: string; text: string; votes: string[] }[]; expiresAt?: number }`

**Permissions**

- Any participant can create and vote.
- No deletion for now (or only sender/admin can delete later).

**Analytics**

- Track `poll_created`, `poll_voted`, per chat and per user.

---

### 3.2 Icebreaker Cards & Quick Games

**Description**

Predefined “icebreaker cards” you can inject into chat to prompt playful answers (e.g. “2 truths & 1 lie”, “Would you rather…”, “This or That”).

**User Flow**

- In chat, user taps **“✨ Icebreakers”**.
- Choose a template category:
  - “Get to know you”
  - “Flirty”
  - “Deep talk”
- Card appears as a special message (`type: 'icebreaker'`) with instructions.
- Users reply as normal text; optionally tag replies to an icebreaker.

**Data Model**

- `ChatMessage`:
  - `type: 'icebreaker'`
  - `icebreaker?: { templateId: string; title: string; prompt: string; category: string }`

**Admin**

- Admin UI in `AdminDashboard` to manage icebreaker templates.

**Analytics**

- `icebreaker_sent`, `icebreaker_replied` counts.

---

### 3.3 Smart Reply Templates (AI‑Assisted)

**Description**

AI‑generated reply suggestions tailored to the last message and the other user’s MBTI, hobbies, and red flags.

**User Flow**

- Long‑press a message or tap a small **“💡 Suggest reply”** button under it.
- Show 2–3 suggested responses in a small bottom sheet.
- Tap to insert into input; user can edit before sending.

**Backend**

- Extend existing Gemini service:
  - `getSmartReplies(message, recentContext, currentUser, partnerUser)`.

**Data Model**

- No new persistent fields; use ephemeral UI state.
- Log usage to `user_action_logs` with `action: 'smart_reply'`.

**Analytics**

- `smart_reply_requested`
- `smart_reply_accepted` (user actually sends).

---

### 3.4 Conversation Milestones & Streaks

**Description**

Celebrate relationship progression: messages exchanged, days chatting, events attended together.

**UX**

- Subtle system messages in chat:
  - “🎉 You’ve exchanged 100 messages!”
  - “🔥 3 days in a row chatting!”
- Trigger simple confetti / heart animation in chat header.

**Data Model**

- Optional new collection: `chat_stats/{chatId}`:
  - `messagesCount: number`
  - `consecutiveDays: number`
  - `lastMessageDate: number`
- Or compute on the fly from messages (simpler but heavier).

**Analytics**

- `milestone_reached` events with type and threshold.

---

## 4. Group Activities & New Friends

### 4.1 Themed Group Rooms

**Description**

Persistent group “rooms” around interests or MBTI combos (e.g. “Analysts & Explorers Hangout”, “Hiking in HK”).

**User Flow**

- New **“Groups” tab** in Discover or Events area.
- List of group rooms with:
  - Name, description, topic, member count.
- Tap to open group chat (like a multi‑user chat).
- Users can join/leave freely.

**Data Model**

- New collection: `group_rooms`:
  - `id`
  - `name`
  - `description`
  - `topicTags: string[]`
  - `createdBy: userId`
  - `members: string[]`
  - `maxMembers?: number`
- Reuse `chats` collection for group messages:
  - `chats/{chatId}` with `isGroup: true`, `groupRoomId`.

**Rules**

- Authenticated users can read/join rooms and read/write messages.
- Only creator/admin can edit room metadata.

---

### 4.2 Event Group Chats

**Description**

Every event gets its own group chat for pre‑event coordination and post‑event sharing.

**User Flow**

- When creating an event, automatically create `chats/{eventChatId}` with `isEvent: true`, `eventId`.
- In `EventsScreen` and event detail:
  - Button: **“Open Event Chat”**.
- Attendees auto‑added as participants on join.

**Data Model**

- `Event`:
  - `chatId?: string`
- `ChatRoom`:
  - `isEvent?: boolean`
  - `eventId?: string`

**Rules**

- Only event participants (and admin) can read/write the event chat.

---

### 4.3 Speed‑Friending Sessions (Lobby + Short Chats)

**Description**

Timed “speed chat” sessions where users are auto‑matched for 3–5 minute conversations with new people.

**User Flow**

- New entry point: **“Speed Friending”** in Events / Groups.
- User joins an upcoming session time slot.
- Server (or client‑side matching for v1) pairs users and creates temporary chats.
- After timer ends:
  - Prompt: “Do you want to stay connected?” with buttons:
    - “Yes, keep chat”
    - “No, close”

**Data Model**

- New collection: `speed_sessions`:
  - `startTime`, `duration`, `participants: string[]`, `status`.
- Temporary `chats` with `isSpeedChat: boolean`.

**Analytics**

- `speed_session_joined`
- `speed_match_created`
- `speed_match_kept` vs `speed_match_closed`.

---

### 4.4 Post‑Event “People You Met” Recommendations

**Description**

After attending an event, suggest people from that event to follow up with.

**User Flow**

- After event end time:
  - On Discover or Events tab, show a card:
    - “You met 5 new people at [Event Name]”
    - Carousel of attendee cards with **“Say hi”** button.
- “Say hi” opens a pre‑filled chat with an icebreaker related to the event.

**Data Model**

- Extend `Event`:
  - `participants: string[]` (already present).
- Derive “people you met” as other participants with whom user has not yet chatted.

**Analytics**

- `post_event_recommendation_shown`
- `post_event_message_sent`.

---

## 5. Priorities

### High Priority (v4.0)

1. Inline Polls in Chat  
2. Icebreaker Cards  
3. Event Group Chats  
4. Post‑Event “People You Met”

### Medium Priority (v4.1+)

5. Smart Reply Templates  
6. Conversation Milestones & Streaks  
7. Themed Group Rooms  
8. Speed‑Friending Sessions

---

## 6. Implementation Notes

- **Reuse existing types and services**
  - Extend `ChatMessage`, `ChatRoom`, and `Event` interfaces.
  - Use existing `user_action_logs` for logging feature usage.

- **Incremental rollout**
  - Hide advanced / experimental features behind config flags in `constants.ts`.
  - Enable per‑environment: local → staging → production.

- **Performance**
  - For v4, keep all new “heavy” data (polls, icebreakers, group rooms) in their own collections or in chat messages, not deeply nested structures.
  - Consider Firestore queries with limits and indexes for group feeds.


