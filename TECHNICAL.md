# EternaLink — comment l'appli marche, côté code

> Ce doc part du principe que tu connais **React 18 + une stack classique
> (Vite/CRA + Express/Node API + fetch côté client)**. Ici on est sur
> **Next.js 16 (App Router) + React 19 + Server Actions**, donc plein de
> trucs sont nouveaux. À chaque concept inhabituel je mets un encart
> **Nouveau** pour expliquer ce que c'est.
>
> L'objectif : tu dois pouvoir suivre une requête de bout en bout
> (URL → middleware → page → DB → HTML rendu, ou form → action serveur →
> DB → revalidation → re-render).

---

## 1. Vue d'ensemble en 30 secondes

EternaLink est un site mémoriel. Trois rôles :

- **Visiteur** : scanne un QR, atterrit sur `/<locale>/m/<slug>`, lit la page mémoriale (lecture seule, public).
- **Famille** : reçoit une URL secrète `/<locale>/family/<token>`, peut éditer (pas de login).
- **Admin** : connexion par mot de passe sur `/<locale>/admin`, crée/publie/supprime les mémorials.

La pile :

- **Next.js 16** App Router, `proxy.ts` (ex-`middleware.ts`).
- **React 19** : Server Components par défaut, `useActionState`, `useFormStatus`.
- **TypeScript** + **Tailwind v4**.
- **Supabase** : Postgres + Storage. Deux clients (anon RLS + service-role).
- **next-intl** : i18n FR/EN/HE/YI, RTL inclus.
- **@hebcal/core** : conversion date grégorienne ↔ hébraïque.
- **qrcode** : génération PNG côté Node pour l'endpoint `/api/qr/[slug]`.

Arborescence (résumée) :

```
app/
  layout.tsx                       passe-plat (voir §3)
  [locale]/
    layout.tsx                     <html>, <body>, fonts, IntlProvider
    page.tsx                       landing
    m/[slug]/page.tsx              page publique (Server Component)
    family/[token]/page.tsx        édition famille (token-gated)
    admin/page.tsx                 dashboard admin (cookie-gated)
    admin/login/page.tsx
    error.tsx, not-found.tsx, loading.tsx
  api/qr/[slug]/route.ts           Route Handler (PNG)
components/                        UI : mix Server + "use client"
i18n/                              config next-intl
lib/                               actions, queries, supabase, auth, utils, psalm119
messages/                          en/fr/he/yi.json
proxy.ts                           middleware (i18n + admin gate)
next.config.ts
```

---

## 2. Le concept-clé qui change tout : Server Components & Server Actions

> **Nouveau (vs React 18)**
>
> En React 18 classique, tous tes composants tournent dans le navigateur.
> Tu fais un `useEffect` + `fetch('/api/...')` pour aller chercher des
> données, puis tu re-rends.
>
> En **React 19 + Next App Router**, **tous les composants sont des
> Server Components par défaut**. Ils s'exécutent côté serveur, peuvent
> être `async`, peuvent `await` une requête DB **directement** sans
> passer par un endpoint REST. Le serveur sérialise le rendu (RSC
> payload), le navigateur le reconstitue.
>
> Pour qu'un composant tourne côté client (state, effets, listeners), tu
> mets `"use client"` en haut du fichier. Tout ce que ce composant
> importe — sauf certains modules serveur explicites — bascule aussi
> côté client.
>
> **Server Actions** : à l'inverse, depuis le client tu peux appeler
> directement une fonction `"use server"` comme si c'était locale. Next
> la transforme en `POST` HTTP en interne. Plus besoin d'écrire des
> handlers `/api/save`. Tu donnes la fonction au prop `action={...}`
> d'un `<form>`, ou tu l'appelles depuis un `useActionState`.

À retenir avant la suite :

- Un fichier sans `"use client"` → tourne **uniquement sur le serveur**.
- Un fichier `"use server"` → exporte des **Server Actions** appelables
  depuis le client (mais le code ne fuit pas dans le bundle).
- Un Server Component peut importer un Client Component (et lui passer
  des props sérialisables). L'inverse est interdit ; un Client
  Component peut juste recevoir des Server Components en `children`.

---

## 3. Le routing & le rendu d'une page publique

Suivons une visite : un utilisateur scanne le QR et atterrit sur
`https://…/fr/m/raphael-abc123`.

### 3.1 Le `proxy.ts` (ex-middleware)

> **Nouveau**
>
> Dans Next.js < 16 ce fichier s'appelait `middleware.ts`. À partir de
> Next 16 c'est `proxy.ts` et la fonction exportée s'appelle `proxy`.
> Sémantique identique : ça tourne sur l'**Edge Runtime** (V8 isolate,
> pas Node) avant chaque requête qui matche le `config.matcher`.

```26:46:proxy.ts
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Locale-aware admin gate. We check the path *before* deferring to the
  // intl middleware because we want to preserve the locale prefix when
  // redirecting to /<locale>/admin/login.
  const adminMatch = pathname.match(/^\/([a-z]{2})\/admin(\/|$)/);
  if (adminMatch) {
    const locale = adminMatch[1];
    const isLoginPage = pathname.startsWith(`/${locale}/admin/login`);
    if (!isLoginPage) {
      const hasCookie = request.cookies.get(ADMIN_COOKIE)?.value;
      if (!hasCookie) {
        const loginUrl = new URL(`/${locale}/admin/login`, request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return intlMiddleware(request);
}
```

Deux jobs :

1. **i18n** : si l'URL n'a pas de préfixe locale, `intlMiddleware`
   redirige (ex. `/m/foo` → `/en/m/foo` selon `Accept-Language`).
2. **Admin gate (optimiste)** : si on demande `/<locale>/admin/*` sans
   le cookie `el_admin`, on redirige direct sur `login`. C'est juste un
   pré-filtre rapide ; la vérif crypto se refait dans la page (defense
   in depth, voir §6).

### 3.2 Les layouts imbriqués

> **Nouveau**
>
> En App Router, **chaque dossier peut avoir un `layout.tsx`** qui
> wrappe tous ses enfants. Le layout est persistant entre navigations
> (il ne se re-rend pas si tu navigues de `/m/a` à `/m/b`). C'est
> hiérarchique :

```
app/layout.tsx                ← root, requis par Next
app/[locale]/layout.tsx       ← <html>, fonts, IntlProvider
app/[locale]/m/[slug]/page.tsx
```

Le `app/layout.tsx` racine est volontairement vide (pass-through) parce
que le vrai `<html lang dir>` doit connaître la locale, qui n'est dispo
que dans `[locale]/layout.tsx` :

```11:15:app/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
```

Le layout localisé fait trois choses :

```38:64:app/[locale]/layout.tsx
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Required for static rendering of locale-prefixed Server Components.
  setRequestLocale(locale);

  const dir = isRtl(locale as Locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${frank.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[color:var(--color-bg)] text-[color:var(--color-ink)]">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

> **Nouveau : `params: Promise<…>`**
>
> Depuis Next 15, `params` et `searchParams` sont **asynchrones**.
> Tu dois `await` pour les lire. Idem `cookies()` et `headers()`. C'est
> pour permettre à Next de différer leur résolution selon la stratégie
> de rendu (statique vs dynamique).

### 3.3 La page publique : `m/[slug]/page.tsx`

```33:50:app/[locale]/m/[slug]/page.tsx
export default async function PublicMemorialPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) {
    return <SetupNotice contextKey="memorial" />;
  }

  const memorial = await fetchPublishedMemorialBySlug(slug);
  if (!memorial) notFound();

  const t = await getTranslations("memorial");

  const displayName = memorial.civil_name || memorial.hebrew_name;
```

Note bien : c'est un composant **`async`**. Il va chercher la donnée
**directement** dans Postgres via Supabase (pas de fetch HTTP
intermédiaire), puis rend le HTML. Pour le client : il reçoit du HTML
prêt + un payload RSC pour reconstruire l'arbre React.

`export const dynamic = "force-dynamic"` (en haut du fichier) : on
désactive la mise en cache → chaque visite refait la requête. Pour un
mémorial qui peut être édité/dépublié à tout moment, c'est ce qu'on
veut.

### 3.4 La couche query (`lib/queries.ts`)

```19:37:lib/queries.ts
export async function fetchPublishedMemorialBySlug(
  slug: string
): Promise<MemorialWithPhotos | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("memorials")
    .select("*, photos(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  const photos = (data.photos ?? []) as Photo[];
  photos.sort((a, b) => a.position - b.position);
  return { ...(data as Memorial), photos };
}
```

> **Nouveau : `import "server-only"`**
>
> Le fichier `lib/queries.ts` commence par `import "server-only"`. C'est
> un module sentinelle : si jamais un Client Component l'importe par
> erreur, le **build casse**. Garantie statique qu'on n'expose pas la
> clé service-role au navigateur.

### 3.5 Les deux clients Supabase

```46:68:lib/supabase.ts
export function getPublicSupabase(): SupabaseClient | null {
  if (_public !== undefined) return _public;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    _public = null;
    return null;
  }
  _public = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _public;
}

export function getServiceSupabase(): SupabaseClient | null {
  if (_service !== undefined) return _service;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    _service = null;
    return null;
  }
  _service = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _service;
}
```

- `getPublicSupabase()` : clé publishable (anon). Sécurisé côté client.
  Soumis à **RLS** (Row-Level Security) côté Postgres → ne renvoie que
  les rows `is_published = true`.
- `getServiceSupabase()` : clé secret. **Bypasse RLS**. Réservée au
  serveur. Sert pour le lookup par token (qui doit fonctionner même si
  `is_published = false`) et pour toutes les écritures.

### 3.6 Streaming et `loading.tsx`

> **Nouveau**
>
> Si tu colles un fichier `loading.tsx` à côté d'une page, Next l'utilise
> automatiquement comme fallback de `<Suspense>` pendant que la page
> async résout. C'est du **streaming** : le shell HTML part vite, et
> dès que la page est prête, le navigateur swap.

```1:16:app/[locale]/m/[slug]/loading.tsx
export default function MemorialLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 sm:px-6">
      <div className="animate-pulse space-y-6">
        <div className="mx-auto h-10 w-3/4 rounded bg-[color:var(--color-line)]" />
```

Idem `not-found.tsx` (rendu sur `notFound()`) et `error.tsx` (Error
Boundary, doit être un Client Component).

---

## 4. Internationalisation (next-intl)

Quatre locales : `en`, `fr`, `he`, `yi`. RTL pour `he`/`yi`.

### 4.1 Le routing

```16:20:i18n/routing.ts
export const routing = defineRouting({
  locales: ["en", "fr", "he", "yi"],
  defaultLocale: "en",
  localePrefix: "always",
});
```

`localePrefix: "always"` → toutes les URLs sont préfixées (`/fr/…`).

### 4.2 Charger les messages côté serveur

```12:22:i18n/request.ts
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

Câblé via `next.config.ts` :

```1:5:next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
```

### 4.3 Server vs Client : deux APIs

- Dans un **Server Component** :
  ```tsx
  import { getTranslations } from "next-intl/server";
  const t = await getTranslations("memorial");
  return <h1>{t("title")}</h1>;
  ```
- Dans un **Client Component** :
  ```tsx
  import { useTranslations } from "next-intl";
  const t = useTranslations("family");
  ```

Dans `[locale]/layout.tsx`, `<NextIntlClientProvider>` rend les
messages dispos pour les Client Components descendants.

> **Nouveau : `setRequestLocale(locale)`**
>
> À appeler en haut de **chaque** Server Component locale-prefixé.
> Ça permet à next-intl de connaître la locale **avant** que
> `getTranslations` soit appelé (sinon il essaierait de la déduire de
> la requête, ce qui casse le rendu statique).

### 4.4 Navigation locale-aware

```10:11:i18n/navigation.ts
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

→ Tu importes `Link` depuis `@/i18n/navigation` au lieu de
`next/link`. Le préfixe locale est ajouté automatiquement.

---

## 5. Le formulaire d'édition famille — le morceau le plus React 19

C'est là que tout devient intéressant. La page :

```43:46:app/[locale]/family/[token]/page.tsx
  const [memorial, isAdmin] = await Promise.all([
    fetchMemorialByToken(token),
    isAdminSession(),
  ]);
```

Le Server Component charge le mémorial par token (via service-role,
parce qu'on doit pouvoir éditer même quand `is_published = false`),
vérifie en parallèle si la session admin est active, et passe tout
ça à `<EditForm>` qui est un Client Component.

### 5.1 `useActionState` + soumission custom

```51:62:components/EditForm.tsx
  const [saveState, saveAction, savePending] = useActionState(
    async (_prev: SaveResult | null, fd: FormData) => {
      const result = await saveMemorialAction(fd);
      if (result.ok) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setStagedFiles([]);
        setStagedError(null);
      }
      return result;
    },
    initialSave
  );
```

> **Nouveau : `useActionState` (React 19)**
>
> Anciennement `useFormState` de `react-dom`, renommé et promu dans
> React 19. Signature :
>
> ```ts
> const [state, dispatch, isPending] = useActionState(action, initial);
> ```
>
> - `action(prevState, formData) → newState` : ta fonction (souvent une
>   Server Action).
> - `state` : la dernière valeur retournée par l'action.
> - `dispatch` : à passer à `<form action={dispatch}>` ou à appeler
>   manuellement.
> - `isPending` : booléen géré par React, plus besoin d'un state perso.
>
> Tu n'as **plus** besoin de `useState` pour gérer "loading" /
> "error" / "success" autour d'un submit. C'est tout intégré.

Mais ici on ne plug **pas** directement `saveAction` au `<form
action={...}>`. Pourquoi ? Parce qu'on veut **compresser les images
côté client avant envoi** :

```111:120:components/EditForm.tsx
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (compressing) return;
    const fd = new FormData(e.currentTarget);
    fd.delete("photos");
    for (const f of stagedFiles) fd.append("photos", f);
    startTransition(() => {
      saveAction(fd);
    });
  }
```

> **Nouveau : `useTransition` autour d'un dispatch manuel**
>
> Quand tu déclenches une Server Action **toi-même** (pas via le
> binding natif `<form action={…}>`), React **exige** que ce soit dans
> une transition, sinon `isPending` du `useActionState` ne se met pas
> à jour. D'où le `startTransition` ci-dessus.

### 5.2 Le `useFormStatus` des sous-boutons

Pour les `<form>` simples (publish toggle, logout, delete) qui n'ont
pas besoin de `useActionState`, on a un bouton générique :

```47:64:components/SubmitButton.tsx
export function SubmitButton({
  …
}: {
  …
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      …
```

> **Nouveau : `useFormStatus`**
>
> Hook qui lit l'état du **formulaire parent le plus proche**. Tu
> n'as **rien à passer** comme prop : il va chercher tout seul. Le
> seul piège : il doit être dans un Client Component **descendant**
> d'un `<form>`. Si tu le mets dans le composant qui rend le `<form>`
> lui-même, il renverra toujours `pending: false`.

### 5.3 La Server Action côté serveur

```252:298:lib/actions.ts
export async function saveMemorialAction(
  formData: FormData
): Promise<SaveResult> {
  try {
    const sb = requireService();
    const token = String(formData.get("token") ?? "");
    if (!token) return { ok: false, error: "Missing token." };

    // `hebrew_name` is religiously significant (drives the Psalm 119 reading)
    // and is verified at intake. The family form hides the field; admins
    // editing the same form can update it — we gate that here.
    const isAdmin = await isAdminSession();
    const updates: Record<string, string | null> = {
      civil_name: String(formData.get("civil_name") ?? "").trim(),
      biography: String(formData.get("biography") ?? "").trim(),
      death_date: String(formData.get("death_date") ?? "").trim() || null,
      hebrew_death_date: String(
        formData.get("hebrew_death_date") ?? ""
      ).trim(),
    };
    if (isAdmin) {
      …
    }

    const { data: memorial, error: updateErr } = await sb
      .from("memorials")
      .update(updates)
      .eq("family_token", token)
      .select("id, slug")
      .maybeSingle();
```

Notes :

- `"use server"` en tête de `lib/actions.ts` → toutes les `export
  async function` deviennent des Server Actions appelables depuis le
  client.
- L'**autorisation** repose sur le `family_token` envoyé dans le
  formulaire : on `update().eq("family_token", token)`. Si le token
  est faux, zéro row updaté, on renvoie une erreur. Pas besoin de
  session : le token **est** la creds.
- L'admin a en plus le droit d'éditer `hebrew_name` /
  `hebrew_parent_name` / `gender` (champs liturgiques). On
  re-vérifie `isAdminSession()` côté serveur — la prop `isAdmin` du
  client n'est qu'un hint UX.

### 5.4 La revalidation : `revalidatePath`

À la fin de l'action :

```357:359:lib/actions.ts
    revalidatePath(`/family/${token}`);
    revalidatePath(`/m/${memorial.slug}`);
    return { ok: true, photosUploaded: uploaded };
```

> **Nouveau : `revalidatePath`**
>
> Tu dis à Next : "le cache de cette URL est sale, refais le rendu à
> la prochaine requête". Combiné avec `dynamic = "force-dynamic"` sur
> nos pages, ça invalide aussi le RSC cache que le client garde, et
> sa navigation suivante repart sur une donnée fraîche. C'est ce qui
> fait que **après un save, l'UI affiche les nouvelles données sans
> que tu fasses un seul `setState` manuel** côté client.

### 5.5 Le `BannerEditor` : optimistic UI sans `useEffect`

Le bandeau de cover/profile fait un truc subtil : quand tu uploades,
on affiche tout de suite la preview locale (`URL.createObjectURL`),
puis on remplace par l'URL serveur quand `revalidatePath` rafraîchit
les props.

```75:84:components/BannerEditor.tsx
  const [prevCoverUrl, setPrevCoverUrl] = useState(coverUrl);
  if (prevCoverUrl !== coverUrl) {
    setPrevCoverUrl(coverUrl);
    if (optimisticCover !== null) setOptimisticCover(null);
  }
```

> **Nouveau (changement de mentalité) : `setState` pendant le rendu**
>
> En React 18 tu aurais fait ça dans un `useEffect`. React 19 préfère
> qu'on **détecte le prop changé pendant le rendu** et qu'on appelle
> les setters direct. React rebascule alors immédiatement sur un
> nouveau rendu (sans flash), et `useEffect` n'est plus nécessaire
> pour ce cas. La règle : c'est OK tant que c'est **idempotent** (au
> render suivant, `prevCoverUrl === coverUrl`, donc on n'entre plus
> dans le `if`).

Pour le cleanup des blob URLs en revanche, on garde un `useEffect`
"propre" qui retourne juste sa fonction de cleanup :

```17:22:components/BannerEditor.tsx
function useRevokeBlobOnChange(url: string | null) {
  useEffect(() => {
    if (!url || !url.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
}
```

---

## 6. Auth admin : signed cookie minimaliste

Pas de système d'auth complet. Un seul opérateur, un seul mot de passe
en env (`ADMIN_PASSWORD`). On émet un cookie HMAC.

```66:76:lib/auth.ts
export function buildSessionValue(now: number = Date.now()): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const expiresAt = now + SESSION_TTL_MS;
  // Mix in a random nonce so two sessions issued in the same ms differ
  // (purely cosmetic — defense in depth against "predictable cookie" worries).
  const nonce = randomBytes(8).toString("hex");
  const payload = `${expiresAt}.${nonce}`;
  const mac = sign(`${payload}|admin`, secret);
  return `${payload}.${mac}`;
}
```

Format du cookie : `<expiresAt>.<nonce>.<hmac>`. On revérifie à chaque
page admin via `requireAdmin()`, qui appelle `redirect("/admin/login")`
en cas d'échec :

```108:112:lib/auth.ts
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminSession()) ){
    redirect("/admin/login");
  }
}
```

Le proxy bloque optimistiquement (présence du cookie suffit) ; la
vraie vérif crypto se fait dans la page → defense in depth.

Le login lui-même est une Server Action :

```67:91:lib/actions.ts
export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("login");
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    // Same message regardless of cause so we don't leak whether
    // ADMIN_PASSWORD is set.
    return { ok: false, error: t("incorrect_password") };
  }
  const value = buildSessionValue();
  if (!value) {
    return { ok: false, error: t("auth_misconfigured") };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // matches SESSION_TTL_MS in lib/auth.ts
  });
  redirect(await localizedHref("/admin"));
}
```

> **Nouveau : `cookies()` est `async`**
>
> En Next 15+ : `const jar = await cookies();` puis `jar.get(...)` /
> `jar.set(...)`. Idem `headers()`.

`<LoginForm>` côté client utilise `useActionState(loginAction, ...)` :
soumission native, gestion d'erreur, pending state — sans aucun
`fetch()`.

---

## 7. La logique métier : Psaume 119 et nom liturgique

C'est la partie purement TypeScript, agnostique du framework. Tu
trouves tout dans `lib/psalm119.ts`.

L'idée : la coutume juive consiste à lire les **sections du Psaume 119
correspondant aux lettres du prénom hébreu du défunt**, suivies de "בן
/ בת" (fils/fille de) + nom du parent + נשמה (âme).

```388:400:lib/psalm119.ts
export function extractHebrewLetters(name: string): HebrewLetter[] {
  if (!name) return [];
  const stripped = name.normalize("NFKD").replace(/[\u0591-\u05C7]/g, "");
  const out: HebrewLetter[] = [];
  for (const ch of stripped) {
    if (FINAL_FORMS[ch]) {
      out.push(FINAL_FORMS[ch]);
    } else if (HEBREW_LETTER_SET.has(ch)) {
      out.push(ch as HebrewLetter);
    }
  }
  return out;
}
```

- Strip des niqud / ta'amim (plage Unicode `\u0591-\u05C7`).
- Normalise les lettres finales (`ך → כ`, etc.).
- `getPsalmReading(name)` map chaque lettre vers sa section (8 versets).
- `getLiturgicalSegments({ hebrewName, hebrewParentName, gender })`
  retourne les segments à afficher avec leur sous-titre.

Le composant `<PsalmReading>` (Server Component) consomme cette logique
pure et rend la liste de blocs RTL :

```36:45:components/PsalmSection.tsx
  const segments = getLiturgicalSegments({
    hebrewName,
    hebrewParentName,
    gender,
  });
  if (!segments.length) return null;

  const prayerName = buildPrayerName({ hebrewName, hebrewParentName, gender });
  const t = await getTranslations("memorial");
```

---

## 8. Dates hébraïques (`HebrewDatePicker`)

Un Client Component qui prend une date grégorienne, dérive la date
hébraïque en temps réel via `@hebcal/core`, et soumet **deux** champs :

- `gregorianName` (ex. `death_date`) : ISO `YYYY-MM-DD`.
- `hebrewName` (ex. `hebrew_death_date`) : texte hébreu.

```157:170:components/HebrewDatePicker.tsx
function renderHebrewFromIso(iso: string, afterSunset: boolean): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return "";
  if (afterSunset) date.setDate(date.getDate() + 1);
  try {
    const hd = new HDate(date);
    return hd.renderGematriya(true);
  } catch {
    return "";
  }
}
```

Toggle "après la tombée du jour" → décale la date hébraïque (en halakha
le jour commence au coucher du soleil). Mode manuel pour saisir le
texte directement. Le champ hébreu submit est un `<input type="hidden">`,
donc l'action serveur reçoit la valeur résolue sans connaître la
mécanique du picker.

---

## 9. L'endpoint QR : `/api/qr/[slug]`

> **Nouveau : Route Handlers**
>
> Dans `app/`, un fichier `route.ts` exporte des fonctions nommées
> `GET`, `POST`, etc. Chacune reçoit `(request, ctx)` et renvoie un
> `Response` (Web API standard, pas Express). Pas de `req.body`, pas
> de `res.send` — tu manipules `Request` / `Response` directement.
>
> En Next 16, le contexte est typé via le helper `RouteContext` :

```14:21:app/api/qr/[slug]/route.ts
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/qr/[slug]">
) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9\u0590-\u05FF-]{3,80}$/i.test(slug)) {
    return new Response("Invalid slug", { status: 400 });
  }
```

Le handler génère un PNG via `qrcode`, ajoute un cache long, et
renvoie un `Response` avec `Content-Type: image/png`. C'est tout.

---

## 10. Cycle complet d'une édition (récap visuel)

Famille clique "Sauvegarder" sur `/fr/family/abc…` :

1. Browser : compresse les images en JPEG (`compressImage`).
2. Browser : `onSubmit` construit la `FormData`, appelle
   `saveAction(fd)` dans un `startTransition`.
3. Next intercepte → `POST` interne vers la Server Action
   `saveMemorialAction(fd)`.
4. Serveur : récupère le client service-role, valide le token, `UPDATE
   memorials`, upload chaque fichier dans le bucket Storage, `INSERT`
   dans `photos`.
5. Serveur : `revalidatePath('/family/<token>')` +
   `revalidatePath('/m/<slug>')`.
6. La Server Action `return { ok: true, photosUploaded: N }`.
7. Browser : `useActionState` met à jour `saveState`, `savePending`
   bascule à `false`.
8. Le routeur RSC re-fetch la page (à cause de la revalidation),
   reçoit le nouveau HTML/RSC payload, le merge → la page reflète
   l'état serveur frais. Et `BannerEditor` détecte le changement de
   prop pour drop son optimistic state.

Aucun `fetch('/api/save')`, aucun endpoint REST, aucun `useEffect`
pour resync. La donnée serveur **est** la source de vérité.

---

## 11. Mini-glossaire des nouveautés (cheat-sheet)

| Concept | Tu connais (React 18) | Maintenant |
|---|---|---|
| Récup de données | `useEffect + fetch` | Server Component `async` + `await query()` |
| Mutation | `fetch('/api/x', POST)` | Server Action `"use server"` + `<form action={fn}>` |
| State de submit | `useState('idle' / 'loading' / 'error')` | `useActionState(action, initial)` ou `useFormStatus()` |
| Loading global | spinner manuel + state | `loading.tsx` voisin + `<Suspense>` auto |
| Page non trouvée | `<NotFound />` manuel | `notFound()` + `not-found.tsx` |
| Erreurs runtime | error boundary lib | `error.tsx` (Client Component obligatoire) |
| Middleware | `middleware.ts` (Next < 16) | `proxy.ts` |
| Cookies / headers | sync | **`await cookies()` / `await headers()`** |
| `params` / `searchParams` | sync | **`await params`** |
| Empêcher un module de fuiter au client | rien | `import "server-only"` |
| Resync prop → state | `useEffect([prop])` | Setter pendant le rendu (idempotent) |

---

## 12. À lire dans le repo, dans cet ordre

Si tu veux te plonger dans le code "de la racine vers les feuilles" :

1. `proxy.ts` — entrée de toute requête.
2. `app/[locale]/layout.tsx` — racine du rendu.
3. `app/[locale]/m/[slug]/page.tsx` — Server Component "lecture seule"
   simple.
4. `lib/queries.ts` + `lib/supabase.ts` — couche données.
5. `app/[locale]/family/[token]/page.tsx` — combine page serveur + form
   client.
6. `components/EditForm.tsx` — la pièce React 19 la plus chargée.
7. `lib/actions.ts` — toutes les Server Actions.
8. `lib/auth.ts` — auth admin.
9. `lib/psalm119.ts` — cœur métier, pure TS.
10. `app/api/qr/[slug]/route.ts` — le seul handler REST classique.
