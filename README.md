# Webholm

**Webholm** is a fork of [Nativefier](https://github.com/nativefier/nativefier), maintained independently. See [CHANGELOG](CHANGELOG.md) for fork-specific changes.

![Example of Webholm app in the macOS dock](.github/dock-screenshot.png)

You want to make a native-looking wrapper for WhatsApp Web (or any web page).

```bash
webholm 'web.whatsapp.com'
```

![Walkthrough animation](.github/nativefier-walkthrough.gif)

You're done.

## Introduction

Webholm is a command-line tool to easily create a “desktop app” for any web site
with minimal fuss. Apps are wrapped by [Electron](https://www.electronjs.org/)
(which uses Chromium under the hood) in an OS executable (`.app`, `.exe`, etc)
usable on Windows, macOS and Linux.

I built this because I grew tired of having to Alt-Tab to my browser and then search
through numerous open tabs when using Messenger or
Whatsapp Web ([HN thread](https://news.ycombinator.com/item?id=10930718)). Webholm features:

- Automatically retrieval of app icon / name
- Injection of custom JS & CSS
- Many more, see the [API docs](API.md) or `webholm --help`

## Installation

Install Webholm globally with `npm install -g webholm`. Requirements:

- macOS 10.13+ / Windows / Linux
- [Node.js](https://nodejs.org/) ≥ 16.9 and npm ≥ 7.10

Optional dependencies:

- [ImageMagick](http://www.imagemagick.org/) or [GraphicsMagick](http://www.graphicsmagick.org/) to convert icons.
  Be sure `convert` + `identify` or `gm` are in your `$PATH`.
- [Wine](https://www.winehq.org/) to build Windows apps from non-Windows platforms.
  Be sure `wine` is in your `$PATH`.

<details>
  <summary>Or install with Docker (click to expand)</summary>

  Webholm Docker images are not published yet. Upstream Nativefier images may still work for experimentation:

  - Pull from [Docker Hub](https://hub.docker.com/r/nativefier/nativefier) (upstream): `docker pull nativefier/nativefier`
  - ... or build this repo: `docker build -t local/webholm .`

  By default, `webholm --help` will be executed when using a Webholm image.
  To build e.g. a Gmail app into `~/webholm-apps`,

  ```bash
  docker run --rm -v ~/webholm-apps:/target/ local/webholm https://mail.google.com/ /target/
  ```

  You can pass Webholm flags, and mount volumes to pass local files. E.g. to use an icon,

  ```bash
  docker run --rm -v ~/my-icons-folder/:/src -v $TARGET-PATH:/target local/webholm --icon /src/icon.png --name whatsApp -p linux -a x64 https://web.whatsapp.com/ /target/
  ```
</details>

<details>
  <summary>Or install with Snap & AUR (click to expand)</summary>

  These repos are *upstream Nativefier* packages, not Webholm; use at your own risk.
  If using them, for your security, please inspect the build script.

  - [Snap](https://snapcraft.io/nativefier) (upstream)
  - [AUR](https://aur.archlinux.org/packages/nodejs-nativefier) (upstream)
</details>

## Usage

To create an app for medium.com, simply `webholm 'medium.com'`

Webholm will try to determine the app name, and well as other options that you
can override. For example, to override the name, `webholm --name 'My Medium App' 'medium.com'`

**Read the [API docs](API.md) or run `webholm --help`**
to learn about command-line flags and configure your app.

## Troubleshooting

**See [CATALOG.md](CATALOG.md) for site-specific ideas & workarounds contributed by the community**.

If this doesn’t help, go look at our [issue tracker](https://github.com/nativefier/nativefier/issues).

## Development

Help welcome on [bugs](https://github.com/nativefier/nativefier/issues?q=is%3Aopen+is%3Aissue+label%3Abug) and
[feature requests](https://github.com/nativefier/nativefier/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request)!

Docs: [Developer / build / hacking](HACKING.md), [API / flags](API.md),
[Changelog](CHANGELOG.md).

License: [MIT](LICENSE.md).
