# Processes

Electron has 2 process types: main, and renderer. There are, of course, some other, less inportant ones, but these two are the main focus of this file.

The processes communicate using `ipcMain` and `ipcRenderer`.

In Nereid, the renderers are divided into two groups:

- Nereid UI (also called chrome, not to be confused with the browser)

- Tab renderer

Both of these are working in `BrowserView`s.

The chrome renderer has `nodeIntegration` on and is not executing any external code.

Tab renderers have a preload script, which provides such functions as `alert` and `prompt` to the web pages.

As you may have guessed, there is only one chrome per window, but multiple tabs.

Most of IPC (inter-process communication) happens in the `ipc-mgr.ts`.

IPC messages from main to chrome are not decorated at all since they are only coming from one source. However, some IPC messages from chrome are decorated using the `chrome:` prefix.

```js
requestAnimationFrame(() => {
    ipcRenderer.send('chrome:setHeight', document.body.getBoundingClientRect().height)
  })
```

This code sets the height of the chrome so the *main* knows where to attach the tabs to. This way, the tabs are attached perfectly where the body ends.

There are also window- and tab-specific messages to modify the state of a current tab or window - they are sent with an `action` parameter:

1. `@window`, where `action` is either `close`, `min`, or `max`.

2. `@tab`, where `action` can be `back`, `forward`, `refresh`, `hardRefresh`, `go` with a url or query, `search` with a query, `navigate` / `navigate-hint` with a url, and `stop` to stop the loading of the page.

This kind of naming helps not get confused in all of the messages.

These are messages that chrome sends to main:

- `selectTab (w-id: number)` - Select a tab using window id (more about that in Tabs.md)

- `closeTab (w-id: number)` - Close a tab

- `newTab` - Create a new tab

- `getHints (query: string)` - get the search suggestions

- `@window` and `@tab` 

- `chrome:setHeight (height: number)` - Explained above

- `chrome:setTop (isOnTop: boolean)` - Moves the chrome either above of below the current tab on the z-axis.

And here are the messages chrome recieves from main:

- `adjustHeight` - causes chrome to send the `chrome:setHeight` message back to main.

- `addTab (w-id: number)` - when a tab is added to the chrome's window

- `removeTab (w-id: number)` - guess what

- `tabChange (w-id: number)` - when the current tab changes

- `tabUpdate ({type: string, id: number, value: any})` - when the state of the tab is changed, like when the title changes, or when the tab starts/stops loading.

- `gotHints (hints: Hint[])` - when the main process has fetched hints and sends back the array

```ts
// Here is the hint pseudo type (nereid's code doesn't acually have this)
interface Hint {
  internal: 'search' | 'navigate-hint' // The message on @tab that is going to be sent to main after clicking the hint
  'type': string // i.e. Google search or URL, what appears after the suggestion itself
  text: string // Text / URL of the hint
}
```

There are also some messages that the main should recieve from the tab renderers, but it's a work in progress 😐
