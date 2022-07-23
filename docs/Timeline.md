# Timeline

What happens when you start Nereid?

### Preparation

All of this happens before the `'ready'` event of the app.

Firstly, Nereid initializes all of its modules. It reads the configuration and registers the internal `nereid://` protocol. If any errors happen during this phase, Nereid will shut down with an error.

Then, Nereid starts the extensions. Errors in the extensions are not fatal, of course. More about that in the [Extensions](./Extensions.md) document.

### Initialization

After the `'ready'` event, Nereid initializes its IPC manager and looks at the settings. It will then open a window with, depending on your setting, either your last session's tabs or with whatever you say in the settings.

When it's time to open a window, Nereid will first create the `BrowserWindow`, then immediately crash its renderer by using `window.webContents.forcefullyCrashRenderer()`. This is done to save memory and CPU power, since the `webContents` of the window will not be used.

Then it will assign the private session id to the window and create the chrome.

The chrome is essentially just a `BrowserView` that takes 100% of the window. It is usually behind the tab's BrowserView and goes to the top only when dialogs are shown and stuff.

> The reason behind this is that `BrowserView`'s `webContents` can never move behind the `BrowserWindow` ones. So, the solution is either to create lots of `BrowserView`s (slow), or have just 2 `BrowserView`s that bounce back and fourth on the z-axis (epic and cool)

After the chrome's `webContents` are loaded, the window is shown. Then, the window is populated with one or more tabs.

## Tabs' lifetime

A tab is just a `BrowserView`.

The process of creating a tab can be separated into 3 parts:

1. Creating the `BrowserView` itself.

2. Adding tab to its window: the `BrowserView` is added to `window.tabs`, and added to the chrome.

3. If a tab isn't a background tab, it is then selected.

When you select a tab, the old tab is detached from the `BrowserWindow`, and the new one is attached to it. Simple as that.

When a tab is closed, it is "destroyed" and added to the `'recentlyClosed'` array of its window. When you try to re-open it, the `.reload()` method is called on its `webContents` and the tab is added back to the window.

Tabs are described in the [Tabs](./Tabs.md) section.

## Windows' lifetime

You know what happens when a window is opened.

When it is closed, its tabs are saved to the memory, and all of BrowserViews are destroyed.
