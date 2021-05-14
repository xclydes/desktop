[![Github Workflow build on master](https://github.com/bitwarden/desktop/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/bitwarden/desktop/actions/workflows/build.yml?query=branch:master)
[![Crowdin](https://d322cqt584bo4o.cloudfront.net/bitwarden-desktop/localized.svg)](https://crowdin.com/project/bitwarden-desktop)
[![Join the chat at https://gitter.im/bitwarden/Lobby](https://badges.gitter.im/bitwarden/Lobby.svg)](https://gitter.im/bitwarden/Lobby)

# Bitwarden Desktop Application

[![Platforms](https://imgur.com/SLv9paA.png "Windows, macOS, and Linux")](https://bitwarden.com/download/)

The Bitwarden desktop app is written using Electron and Angular. The application installs on Windows, macOS, and Linux distributions.

![Desktop Vault](https://raw.githubusercontent.com/bitwarden/brand/master/screenshots/desktop-macos-vault.png "My Vault")

# Build/Run

**Requirements**

- [Node.js](https://nodejs.org) v14.17 or greater
- Windows users: To compile the native node modules used in the app you will need the *Visual C++ toolset*, available through the standard Visual Studio installer. You will also need to install the *Microsoft Build Tools 2015* and *Windows 10 SDK 17134* as additional dependencies in the Visual Studio installer.


**Run the app**

```bash
npm install
npm run electron
```

**Debug Native Messaging**

Native Messaging (communication with the browser extension) works by having the browser start a lightweight proxy application baked into our desktop binary. To setup an environment which allows
for easy debugging you will need to build the application for distribution, i.e. `npm run dist:<platform>`, start the dist version and enable desktop integration. This will write some manifests
to disk, Consult the [native manifests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#Manifest_location) documentation for more details of the manifest
format, and the exact locations for the different platforms. *Note* that disabling the desktop integration will delete the manifests, and the files will need to be updated again.

The generated manifests are pre-configured with the production ID for the browser extensions. In order to use them with the development builds, the browser extension ID of the development build
needs to be added to the `allowed_extensions` section of the manifest. These IDs are generated by the browser, and can be found in the extension settings within the browser. 

It will then be possible to run the desktop application as usual using `npm run electron` and communicate with the browser.

# Contribute

Code contributions are welcome! Please commit any pull requests against the `master` branch. Learn more about how to contribute by reading the [`CONTRIBUTING.md`](CONTRIBUTING.md) file.

Security audits and feedback are welcome. Please open an issue or email us privately if the report is sensitive in nature. You can read our security policy in the [`SECURITY.md`](SECURITY.md) file.
