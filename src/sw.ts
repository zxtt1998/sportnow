/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { parseNewsDocument } from "./services/news-validation";
declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name === "sportnow-news-v1")
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    url.origin === self.location.origin &&
    /\/data\/(news|sources-status)\.json$/.test(url.pathname),
  new NetworkFirst({
    cacheName: "sportnow-data-v2",
    networkTimeoutSeconds: 4,
    fetchOptions: { cache: "no-store" },
    plugins: [
      new ExpirationPlugin({ maxEntries: 2, purgeOnQuotaError: true }),
      {
        async cacheWillUpdate({ response, request }) {
          if (response.status !== 200) return null;
          try {
            const body = await response.clone().json();
            if (new URL(request.url).pathname.endsWith("/news.json"))
              parseNewsDocument(body);
            else if (body.schemaVersion !== 2 || !Array.isArray(body.sources))
              return null;
            return response;
          } catch {
            return null;
          }
        },
        async cachedResponseWillBeUsed({ cachedResponse }) {
          if (!cachedResponse) return undefined;
          const headers = new Headers(cachedResponse.headers);
          headers.delete("Content-Encoding");
          headers.delete("Content-Length");
          headers.set("X-SportNow-Cache", "offline");
          return new Response(await cachedResponse.clone().arrayBuffer(), {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers,
          });
        },
      },
    ],
  }),
);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/\/data\//],
  }),
);
