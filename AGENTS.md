# MVP: GitHub-native Social Network

## Цель

Создать MVP open-source социальной сети поверх GitHub.

Концепция:

- GitHub является identity и storage.
- У каждого пользователя есть специальный GitHub repository, который является его социальной страницей.
- Посты пользователя физически хранятся в его repository.
- Frontend полностью client-side.
- Backend отсутствует.
- PostgreSQL, Redis, Supabase, Firebase и любые другие backend/database сервисы НЕ использовать.
- Приложение должно работать как статический сайт и быть пригодным для GitHub Pages.
- В будущем архитектура должна позволять добавить GitLab, Codeberg, IPFS и другие storage providers, но в MVP их НЕ реализовывать.

Главная идея:

GitHub account
    ↓
<username>/social
    ↓
profile + posts
    ↓
Twitter/VK-like UI

---

# 1. MVP Scope

Реализовать только:

1. Landing page
2. GitHub OAuth login
3. Создание/проверка personal social repository
4. Profile page
5. Создание поста
6. Просмотр постов пользователя
7. Home feed
8. Follow/unfollow пользователей
9. Like/reaction
10. Comments
11. Basic recommendations
12. GitHub repository as source of truth
13. Local cache через IndexedDB/localStorage
14. Полностью responsive UI

НЕ реализовывать в MVP:

- собственный backend
- собственную БД
- realtime
- push notifications
- private messaging
- video processing
- complex moderation
- monetization
- ads
- federation
- IPFS
- GitLab/Codeberg
- mobile native applications
- sophisticated ML recommendation system

---

# 2. Основной принцип хранения

Каждый пользователь должен иметь repository:

<github-username>/social

Например:

github.com/alice/social

Repository должен содержать:

.social/
    profile.json

posts/
    YYYY/
        MM/
            DD/
                <post-id>.md

media/
    <post-id>/
        ...

README.md

Repository является source of truth.

Frontend НЕ должен хранить основной контент пользователя.

---

# 3. Формат profile.json

Использовать следующий формат:

{
  "schemaVersion": 1,
  "username": "alice",
  "displayName": "Alice",
  "bio": "Blockchain developer",
  "avatar": "https://...",
  "createdAt": "2026-08-18T00:00:00Z"
}

Не дублировать GitHub данные без необходимости.

GitHub API должен использоваться как источник информации о GitHub profile.

profile.json нужен только для social-specific metadata.

---

# 4. Формат post

Каждый пост должен быть Markdown-файлом.

Пример:

posts/2026/08/18/01JXYZ123.md

Содержимое:

---
schemaVersion: 1
type: post
id: 01JXYZ123
author: alice
createdAt: 2026-08-18T08:32:00Z
---

Hello world!

This is my first post.

Пост должен поддерживать:

- text
- Markdown
- links
- изображения

В MVP максимальная длина поста: 5000 символов.

---

# 5. Post ID

Использовать ULID или UUID.

ID должен быть:

- уникальным
- независимым от GitHub issue number
- стабильным

Не использовать filename как бизнес-ID.

---

# 6. Authentication

Использовать GitHub OAuth.

Не создавать собственный authentication system.

После login приложение должно получить GitHub identity.

Важно:

НЕ хранить GitHub client secret во frontend.

Если для полноценного OAuth flow требуется client secret, использовать GitHub OAuth device flow или другой flow, который позволяет безопасно работать без backend.

Провести анализ GitHub OAuth возможностей перед реализацией.

Если GitHub требует backend для выбранного OAuth flow, НЕ добавлять backend.

Выбрать flow, совместимый с полностью client-side приложением.

---

# 7. Repository onboarding

После первого login:

1. Проверить наличие:

<username>/social

2. Если repository отсутствует:

Показать:

"Create your Social Repository"

3. Создать repository через GitHub API.

Repository:

- public
- name: social
- description: Personal social profile
- initialize README

4. Создать:

.social/profile.json

5. Создать:

posts/.gitkeep

После этого пользователь считается onboarded.

---

# 8. Profile page

URL:

/@username

Страница должна выглядеть как современная социальная сеть, а НЕ как GitHub.

Пример:

--------------------------------
Avatar

Alice
@alice

Blockchain developer

42 followers
128 following

[ Follow ]

--------------------------------

Posts

--------------------------------
Alice · 2h

Building a new blockchain...

❤️ 12   💬 3
--------------------------------

Alice · Yesterday

Another post...

❤️ 45   💬 8
--------------------------------

На странице:

- avatar
- display name
- username
- bio
- followers
- following
- Follow button
- posts
- repository link

---

# 9. Create Post

Главный экран должен иметь composer:

"What are you working on?"

Кнопка:

Post

После публикации:

1. Создать Markdown post
2. Commit через GitHub API
3. Обновить локальный cache
4. Обновить feed

Не создавать отдельный backend.

---

# 10. Wall

Каждый profile должен иметь:

Posts
Wall

В MVP:

Wall = posts пользователя + mentions/references на posts других пользователей.

Не пытаться писать чужой контент в repository пользователя.

Каждый пользователь имеет право изменять только свой repository.

---

# 11. Follow system

Не создавать собственную БД followers.

Использовать GitHub following как базовый social graph.

Frontend должен уметь:

- получить список following
- определить, follow ли текущий пользователь другого пользователя
- follow
- unfollow

Если GitHub API не позволяет нужную операцию безопасно выполнить из client-only приложения, НЕ добавлять backend.

В таком случае реализовать read-only Following в MVP и документировать ограничение.

---

# 12. Feed

Home должен иметь две вкладки:

Following
For You

## Following

Собрать posts пользователей, которых текущий пользователь follows.

Алгоритм:

1. получить following
2. получить repositories <username>/social
3. получить posts
4. отсортировать по createdAt DESC
5. показать последние N постов

N configurable.

Начать с N=100.

---

# 13. For You

НЕ использовать ML в MVP.

Сделать deterministic ranking.

Пример:

score =
    recencyScore * 0.40
    + engagementScore * 0.20
    + authorAffinity * 0.20
    + topicAffinity * 0.20

Но так как engagement и topic data ограничены, можно начать с:

recency
+
following
+
GitHub stars
+
topics

Все вычисления выполнять локально.

Никакого server-side tracking.

---

# 14. Likes

Использовать GitHub reactions там, где это возможно.

UI:

❤️ 42

Frontend должен скрывать GitHub-specific implementation details.

Если reactions нельзя корректно использовать для Markdown file через GitHub API:

использовать GitHub Issue/Discussion как interaction layer.

НЕ создавать собственный backend для likes.

---

# 15. Comments

В MVP использовать GitHub Issues или Discussions как backing storage.

UI должен выглядеть как:

Comments

Alice:
Nice work!

Bob:
Interesting approach.

Пользователь НЕ должен видеть GitHub UI.

Все комментарии отображаются внутри нашего frontend.

Перед реализацией проверить GitHub API возможности для comments/discussions.

---

# 16. Media

В MVP поддержать изображения.

Пользователь выбирает image.

Frontend:

1. загружает файл в:

media/<post-id>/<filename>

2. получает GitHub raw URL
3. добавляет Markdown image в post

Ограничить MVP:

- JPG
- PNG
- WebP
- максимум 10 MB

НЕ поддерживать video в MVP.

---

# 17. Caching

GitHub API нельзя дергать при каждом рендере.

Создать storage abstraction:

interface CacheStorage {
    get(key)
    set(key, value)
    delete(key)
}

Реализация MVP:

IndexedDB.

localStorage использовать только для маленьких settings.

Cache:

- GitHub profiles
- repository metadata
- posts
- following
- feed

TTL configurable.

Default:

5 minutes.

После mutation делать cache invalidation.

---

# 18. Storage abstraction

Даже несмотря на отсутствие backend, код должен иметь abstraction:

interface SocialStorage {
    getProfile(username)
    getPosts(username)
    getPost(username, postId)
    createPost(post)
    uploadMedia(...)
    getFollowing(username)
}

Первая реализация:

GitHubStorage

В будущем:

GitLabStorage
CodebergStorage
IPFSStorage
LocalGitStorage

НЕ реализовывать будущие providers.

---

# 19. GitHub API abstraction

НЕ вызывать GitHub API напрямую из React components.

Создать:

src/
    api/
        github/
            githubClient
            repositories
            users
            contents
            reactions
            issues
            discussions

Компоненты должны работать через domain services.

Например:

socialService.createPost()

а не:

github.createFile()

из UI component.

---

# 20. UI

Использовать современный minimalist social UI.

Основной layout:

┌──────────────────────────────────────────────┐
│ Logo                                         │
├──────────────┬───────────────────┬───────────┤
│ Home         │                   │           │
│ Explore      │     Feed          │           │
│ Notifications│                   │           │
│ Profile      │                   │           │
│              │                   │           │
└──────────────┴───────────────────┴───────────┘

Desktop:

3-column layout.

Mobile:

single-column.

Не копировать дизайн Twitter/X или VK буквально.

Сделать собственный visual identity.

---

# 21. Pages

Создать:

/
/login
/home
/explore
/@username
/@username/post/:postId
/settings

Если GitHub username используется как route, корректно поддержать URL encoding.

---

# 22. Explore

Explore должен показывать:

- popular GitHub users
- popular repositories
- recent social posts
- trending topics

В MVP можно использовать GitHub public API и локальный ranking.

Не создавать backend crawler.

---

# 23. Settings

Настройки:

- GitHub account
- Social repository
- Cache
- Recommendation settings
- Export data
- Logout

Особенно важно:

Export data

Пользователь должен понимать, что его данные находятся в GitHub repository.

Добавить кнопку:

"Open my Social Repository"

---

# 24. Data portability

Это обязательная часть концепции.

Добавить:

Export / Backup

Кнопка должна объяснять:

"Your social data is stored in your GitHub repository and can be cloned or migrated."

Добавить ссылку на repository.

Не реализовывать автоматический backup в MVP.

Но architecture должна позволять его добавить позже.

---

# 25. Privacy

По умолчанию:

- social repository public
- posts public
- profile public

Явно показать пользователю при onboarding:

"Your Social Repository is public."

НЕ хранить private information.

НЕ хранить access token в repository.

НЕ отправлять GitHub token на какой-либо сторонний сервер.

---

# 26. Security

Критически важно:

- GitHub token только в browser memory или безопасном client-side storage согласно выбранному OAuth flow
- никогда не commit token
- никогда не отправлять token в analytics
- никакого telemetry backend
- никаких third-party trackers в MVP
- CSP
- sanitize Markdown
- sanitize HTML
- защита от XSS
- ограничение размера файлов
- проверка MIME type
- не выполнять HTML из post content

---

# 27. Technology

Если repository уже существует — сначала изучить текущий stack и использовать его.

Если проекта ещё нет:

Recommended:

- TypeScript
- React
- Vite
- React Router
- Tailwind CSS
- GitHub API
- IndexedDB
- Vitest
- Playwright

Не добавлять тяжелые зависимости без необходимости.

---

# 28. GitHub Pages

Приложение должно собираться в static assets.

Команда:

npm run build

Результат должен быть deployable на GitHub Pages.

Настроить GitHub Actions:

.github/workflows/deploy.yml

Workflow:

push to main
    ↓
npm install
    ↓
npm run test
    ↓
npm run build
    ↓
deploy GitHub Pages

---

# 29. Testing

Обязательные unit tests:

- post parser
- frontmatter parser
- post sorting
- recommendation scoring
- cache
- GitHub repository detection

E2E tests:

- landing
- login mock
- profile
- feed
- create post mock
- navigation

Не делать реальные destructive GitHub API calls в CI.

GitHub API должен быть mockable.

---

# 30. Developer experience

Добавить:

README.md

В README описать:

- concept
- architecture
- setup
- GitHub OAuth setup
- local development
- deployment
- data model
- security model
- limitations
- roadmap

Добавить:

.env.example

Но НЕ добавлять secrets.

---

# 31. MVP acceptance criteria

MVP считается готовым, если:

[ ] Пользователь может открыть сайт

[ ] Пользователь может войти через GitHub

[ ] Пользователь может создать /social repository

[ ] Пользователь видит свой profile

[ ] Пользователь может создать post

[ ] Post физически появляется в GitHub repository

[ ] Пользователь может открыть свой post

[ ] Другой пользователь может открыть его profile

[ ] Feed отображает posts

[ ] Following feed работает

[ ] Like/reaction работает либо имеет documented GitHub limitation

[ ] Comments работают либо имеют documented GitHub limitation

[ ] Images работают

[ ] IndexedDB cache работает

[ ] Приложение работает без backend

[ ] Приложение собирается как static site

[ ] GitHub Pages deployment работает

[ ] README содержит полную инструкцию

[ ] Нет secrets в repository

[ ] Нет server-side database

---

# 32. Очень важное архитектурное правило

НЕ делать преждевременную архитектуру.

MVP должен быть:

Browser
   ↓
GitHub API
   ↓
GitHub repositories

Никакого:

Browser
   ↓
Backend
   ↓
Database
   ↓
GitHub

Это нарушает основную концепцию проекта.

---

# 33. План реализации

Работать по этапам.

## Phase 1 — Foundation

- создать/проверить frontend
- setup TypeScript
- setup routing
- setup UI system
- GitHub API client
- mock GitHub API
- storage abstraction

## Phase 2 — Identity

- GitHub login
- current user
- profile
- repository onboarding

## Phase 3 — Posts

- post model
- Markdown parser
- create post
- read posts
- profile timeline

## Phase 4 — Social

- following
- feed
- reactions
- comments

## Phase 5 — Media

- image upload
- image rendering

## Phase 6 — Recommendations

- local ranking
- For You
- Explore

## Phase 7 — Cache

- IndexedDB
- invalidation
- offline read-only mode

## Phase 8 — Deployment

- GitHub Actions
- GitHub Pages
- production build
- documentation

---

# 34. После каждого этапа

После каждого Phase:

1. run tests
2. run build
3. inspect git diff
4. fix TypeScript errors
5. update README
6. create a git commit

Не переходить к следующей фазе, если текущая не собирается.

---

# 35. Важное требование к реализации

Перед началом кодирования:

1. Исследуй актуальный GitHub REST API.
2. Исследуй GitHub GraphQL API.
3. Определи, какие операции реально можно выполнить из browser-only приложения.
4. Особое внимание удели:
   - OAuth
   - creating repositories
   - creating/updating files
   - uploading images
   - reactions
   - Issues
   - Discussions
   - following
   - rate limits
5. Не придумывай API endpoints.
6. Если какая-либо функция невозможна без backend — НЕ добавляй backend.
7. Вместо этого предложи fallback или явно зафиксируй ограничение MVP.

После исследования создай:

docs/github-api-limitations.md

с таблицей:

Feature | GitHub API support | Browser-only possible | MVP implementation | Limitation

---

# 36. Начать работу

Сначала:

1. Inspect existing repository.
2. Determine current stack.
3. Inspect package.json.
4. Inspect existing source tree.
5. Do NOT rewrite the project blindly.
6. Produce a short implementation plan based on the actual repository.
7. Then start Phase 1.

Основной принцип:

BUILD THE SMALLEST WORKING VERSION.

Не добавляй функции, которых нет в acceptance criteria.

Не создавай backend.
Не создавай database.
Не добавляй Supabase/Firebase.
Не добавляй analytics.
Не добавляй telemetry.

Главный результат MVP:

GitHub account
      ↓
personal /social repository
      ↓
posts stored as Git files
      ↓
Twitter/VK-like social UI
      ↓
zero backend