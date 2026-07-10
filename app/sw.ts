/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  const pushEvent = event as PushEvent;
  const data = pushEvent.data?.json() ?? {};
  const title = (data as { title?: string }).title ?? "Unloop";
  const options = {
    body: (data as { body?: string }).body ?? "",
    data: { url: (data as { url?: string }).url ?? "/offload" },
    actions: (data as { actions?: { action: string; title: string }[] }).actions ?? [],
  } as NotificationOptions;
  pushEvent.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const clickEvent = event as NotificationEvent;
  clickEvent.notification.close();
  const action = clickEvent.action;
  const url = (clickEvent.notification.data?.url as string) ?? "/offload";

  if (action === "quieter") {
    clickEvent.waitUntil(
      fetch("/api/push/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
    );
    return;
  }

  clickEvent.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
