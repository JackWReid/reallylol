import { render } from "preact";
import { signal } from "@preact/signals";
import Router from "preact-router";
import { hasApiKey, setApiKey, clearApiKey, setAuthFailureHandler, api } from "./lib/api";

const building = signal(false);
const buildMessage = signal<string | null>(null);

async function triggerBuild() {
  building.value = true;
  buildMessage.value = null;
  try {
    await api.post("/api/build/trigger", {});
    buildMessage.value = "Build triggered";
    setTimeout(() => { buildMessage.value = null; }, 3000);
  } catch (e: any) {
    buildMessage.value = e.message || "Build failed";
    setTimeout(() => { buildMessage.value = null; }, 5000);
  } finally {
    building.value = false;
  }
}
import { ContentList } from "./pages/content-list";
import { ContentEditor } from "./pages/content-editor";
import { MediaBrowser } from "./pages/media-browser";
import { Dashboard } from "./pages/dashboard";
import { SyncedData } from "./pages/synced-data";
import { PagesList } from "./pages/pages-list";

const authenticated = signal(false);
const loginError = signal("");
const loginLoading = signal(false);

// Bounce to login on any 401
setAuthFailureHandler(() => {
  authenticated.value = false;
});

// Verify stored key on load
if (hasApiKey()) {
  api.verifyKey().then((valid) => {
    if (valid) {
      authenticated.value = true;
    } else {
      clearApiKey();
    }
  });
}

function Login() {
  let input: HTMLInputElement | null = null;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!input?.value) return;

    loginError.value = "";
    loginLoading.value = true;
    setApiKey(input.value);

    const valid = await api.verifyKey();
    loginLoading.value = false;

    if (valid) {
      authenticated.value = true;
    } else {
      clearApiKey();
      loginError.value = "Invalid API key";
    }
  }

  return (
    <div class="login-wrap">
      <form onSubmit={handleSubmit} class="login-form">
        <h1>really.lol CMS</h1>
        {loginError.value && <div class="error-banner">{loginError.value}</div>}
        <input
          ref={(el) => (input = el)}
          type="password"
          placeholder="API Key"
          class="input mb-sm"
          disabled={loginLoading.value}
        />
        <button type="submit" class="btn btn-primary" style="width:100%" disabled={loginLoading.value}>
          {loginLoading.value ? "Verifying..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

function Nav() {
  return (
    <nav class="nav">
      <a href="/" class="nav-brand">really.lol</a>
      <a href="/content">Content</a>
      <a href="/media">Media</a>
      <a href="/pages">Pages</a>
      <a href="/data">Data</a>
      <a href="/content/new">+ New</a>
      <span class="nav-spacer" />
      <button
        onClick={triggerBuild}
        disabled={building.value}
        class="nav-rebuild"
      >
        {building.value ? "Building..." : buildMessage.value || "Rebuild"}
      </button>
      <button
        onClick={() => {
          clearApiKey();
          authenticated.value = false;
        }}
        class="nav-signout"
      >
        Sign Out
      </button>
    </nav>
  );
}

function App() {
  if (!authenticated.value) return <Login />;

  return (
    <div class="app">
      <Nav />
      <main class="main">
        <Router>
          <Dashboard path="/" />
          <ContentList path="/content" />
          <ContentEditor path="/content/new" />
          <ContentEditor path="/content/edit/:type/:slug" />
          <MediaBrowser path="/media" />
          <PagesList path="/pages" />
          <SyncedData path="/data" />
        </Router>
      </main>
    </div>
  );
}

render(<App />, document.getElementById("app")!);
