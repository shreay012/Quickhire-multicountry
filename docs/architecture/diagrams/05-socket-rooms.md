# Socket.io Room Topology

---

## Overview

```mermaid
graph TB
    subgraph SERVER["Socket.io Server (Port 4000, Path /api/socket.io)"]
        subgraph ADAPTER["Redis Adapter (pub/sub)"]
            REDIS_CH["Redis Channels\n(cross-pod routing)"]
        end

        subgraph ROOMS["Socket.io Rooms"]
            UR["user_{userId}\n(every authenticated user)"]
            RA["role_admin\n(all 7 admin roles)"]
            CHR["chat room\n{pmId}_service_{serviceId}\nor\nservice_{serviceId}_pending_{userId}"]
        end
    end

    subgraph CLIENTS["Connected Clients"]
        C1["Customer A\n(user_cust1)"]
        C2["Customer B\n(user_cust2)"]
        PM1["PM (user_pm1)\n+ role_admin"]
        ADM["Admin\n(user_adm1)\n+ role_admin"]
        RS1["Resource\n(user_res1)"]
    end

    C1 -->|joins| UR
    C2 -->|joins| UR
    PM1 -->|joins| UR
    PM1 -->|joins| RA
    ADM -->|joins| UR
    ADM -->|joins| RA
    RS1 -->|joins| UR

    C1 -->|joins when in booking| CHR
    PM1 -->|joins when assigned| CHR
```

---

## Connection Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend<br/>(SocketProvider.jsx)
    participant SV as Socket.io Server
    participant Redis as Redis Adapter
    participant MW as io.use() middleware

    Note over FE: "userLoggedIn" event fires<br/>(after OTP verify)

    FE->>SV: connect<br/>ws://localhost:5000/api/socket.io ← BUG: hardcoded<br/>auth: { token: JWT }

    SV->>MW: io.use() middleware

    MW->>MW: jwt.verify(token, publicKey)
    alt invalid token
        MW-->>FE: Error: UNAUTHORIZED
        FE->>FE: disconnect
    end

    MW->>MW: socket.data.user = { id, role }
    MW->>SV: next()

    SV->>SV: socket.join("user_" + user.id)

    alt user.role in ADMIN_ROLES
        SV->>SV: socket.join("role_admin")
    end

    SV->>Redis: Publish socket connection event
    SV->>SV: metrics: connected_sockets++

    FE-->>FE: onConnected() called<br/>setIsConnected(true)

    Note over FE,SV: User logs out
    FE->>SV: disconnect
    SV->>SV: metrics: connected_sockets--
```

---

## Chat Room Naming Convention

```mermaid
graph LR
    subgraph PRE["Pre-Assignment State"]
        P["service_{serviceId}_pending_{userId}"]
    end

    subgraph POST["Post-Assignment State"]
        A["{pmId}_service_{serviceId}"]
    end

    PRE -->|PM assigned| POST

    style PRE fill:#fff3cd
    style POST fill:#d4edda
```

**Room ID logic from `chat.service.js`:**
```
roomIdFor(pmId, serviceId, userId):
  if pmId is set:
    return "{pmId}_service_{serviceId}"   ← PM has been assigned
  else:
    return "service_{serviceId}_pending_{userId}"  ← awaiting PM
```

After PM assignment, the room ID changes. Both the customer and the PM must join the new room ID to continue chatting.

---

## Events Reference

### Server → Client Events

| Event | Room | Payload | When |
|---|---|---|---|
| `notification` | `user_{userId}` | `{ type, title, body, data }` | Any notification (BOOKING_CONFIRMED, ASSIGNED_TO_PM, etc.) |
| `notification:new` | `user_{userId}` | Same as above | Duplicate emit for backwards compat |
| `new-message` | chat room | `{ _id, roomId, senderId, content, type, createdAt }` | New chat message |
| `message-seen` | chat room | `{ messageId, userId, at }` | Message marked as seen |
| `booking:updated` | `user_{userId}` | `{ jobId, status, ... }` | Booking status changes |
| `pm:assigned` | `user_{userId}` | `{ jobId, pmId, pmName }` | PM assignment complete |

### Client → Server Events (chat.socket.js)

| Event | Handler | Action |
|---|---|---|
| `join-room` | `handleJoinRoom` | `socket.join(roomId)` — validates user is participant |
| `send-message` | `handleSendMessage` | Insert to `messages` collection + broadcast `new-message` |
| `mark-seen` | `handleMarkSeen` | `$addToSet seenBy` + broadcast `message-seen` |
| `typing` | `handleTyping` | Broadcast `typing` event to room (no DB persist) |
| `disconnect` | auto | Leave all rooms, decrement metrics gauge |

---

## Notification Fan-Out Pattern

```mermaid
sequenceDiagram
    autonumber
    participant API as Express API
    participant BullMQ as BullMQ<br/>(notifications queue)
    participant Worker as notification worker
    participant Redis as Redis pub/sub
    participant DB as MongoDB
    participant Socket as Socket.io
    participant SNS as AWS SNS

    API->>BullMQ: enqueueNotification({ userId, type, title, body })

    BullMQ->>Worker: Process job

    Worker->>DB: INSERT notifications collection<br/>{ userId, type, title, body, read: false }

    Worker->>Socket: emitTo("user_" + userId, "notification", payload)
    Socket->>Redis: Publish to Redis adapter
    Redis-->>Socket: Route to correct pod
    Socket-->>CLIENT: Real-time notification received

    Worker->>DB: find user.fcmTokens[]
    loop For each FCM token
        Worker->>SNS: PublishCommand(endpointArn, message)
        SNS-->>MOBILE: Push notification delivered
    end
```

---

## Multi-Pod Scaling via Redis Adapter

```mermaid
graph LR
    subgraph POD1["Pod 1 (Render instance 1)"]
        SIO1["Socket.io\nPod 1"]
        C1["Customer A\nconnected here"]
    end

    subgraph POD2["Pod 2 (Render instance 2)"]
        SIO2["Socket.io\nPod 2"]
        PM1["PM\nconnected here"]
    end

    subgraph REDIS["Redis"]
        PUBSUB["pub/sub channels\nper room"]
    end

    C1 -->|send message| SIO1
    SIO1 -->|publish to room channel| PUBSUB
    PUBSUB -->|subscribe| SIO2
    SIO2 -->|emit new-message| PM1

    Note: Customer A on Pod 1, PM on Pod 2 — message still delivered
```

**Critical:** The Redis adapter is already configured in `socket/index.js`. Multi-pod socket routing works out of the box on Render multi-instance deployments. The only blocker is the hardcoded `localhost:5000` in `SocketProvider.jsx` — fix this before any real deployment.

---

## Socket Client (SocketProvider.jsx) State Machine

```mermaid
stateDiagram-v2
    [*] --> Disconnected : App loads
    Disconnected --> Connecting : "userLoggedIn" event OR\nlocalStorage poll detects token
    Connecting --> Connected : Socket handshake + JWT auth OK
    Connecting --> Disconnected : Auth failed / connection error
    Connected --> Listening : Auto-join user_{id} + role_admin rooms
    Listening --> Listening : Messages / notifications received
    Listening --> Disconnected : Logout / token cleared / disconnect event
    Disconnected --> [*] : App unmount

    note right of Connected
        onNotificationReceived → showToast() + dispatch Redux
        onMessageReceived → update chat state
        Requests Notification.permission for browser push
    end note

    note right of Disconnected
        Console.log statements left in all states
        ⚠️ production code leaks state to browser console
    end note
```

---

## Known Bugs

| Bug | Location | Impact |
|---|---|---|
| `baseUrl: "http://localhost:5000"` hardcoded | `SocketProvider.jsx:69` | Socket never connects in any deployed environment |
| `console.log` with emojis in all state transitions | `SocketProvider.jsx:21,27,...` | Internal socket state exposed in browser console |
| Backend socket path `/api/socket.io` vs frontend path `/socket.io` | If mis-configured | 404 on socket handshake |
