// PaperVault.app — menu-bar wrapper (the bundle's main executable).
//
// PaperVault's real executable is a tiny local web server (it must run over
// http://127.0.0.1 so the camera, QR scanner and Web Crypto get a secure
// context). This wrapper starts that server, opens it in the user's browser,
// and lives quietly in the macOS menu bar with a Quit item — no Terminal, no
// modal dialog, no orphaned process. Compiled on the build machine:
//   swiftc -O -o PaperVault launcher.swift -framework AppKit
import AppKit
import Foundation

final class AppController: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var server: Process?
    private var url = ""
    private var signalSources: [DispatchSourceSignal] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        installSignalHandlers()
        setupStatusItem()
        startServer()
    }

    // Kill the server on SIGTERM/SIGINT too (logout, `kill`), not just menu Quit,
    // so the background server never outlives the app.
    private func installSignalHandlers() {
        for sig in [SIGTERM, SIGINT] {
            signal(sig, SIG_IGN)
            let src = DispatchSource.makeSignalSource(signal: sig, queue: .main)
            src.setEventHandler { [weak self] in
                self?.server?.terminate()
                exit(0)
            }
            src.resume()
            signalSources.append(src)
        }
    }

    // The server binary is bundled in Contents/Resources.
    private func serverPath() -> String {
        if let p = Bundle.main.path(forResource: "papervault", ofType: nil) { return p }
        let exeDir = Bundle.main.executableURL!.deletingLastPathComponent()
        return exeDir.appendingPathComponent("../Resources/papervault").standardized.path
    }

    private func startServer() {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: serverPath())
        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = pipe
        // Watch the server's output for its URL, then open the browser once.
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard let self = self, !data.isEmpty,
                  let text = String(data: data, encoding: .utf8) else { return }
            if self.url.isEmpty,
               let r = text.range(of: #"http://127\.0\.0\.1:[0-9]+"#, options: .regularExpression) {
                let found = String(text[r])
                DispatchQueue.main.async {
                    self.url = found
                    let env = ProcessInfo.processInfo.environment
                    if let f = env["PV_URL_FILE"] { try? found.write(toFile: f, atomically: true, encoding: .utf8) }
                    if env["PV_NO_BROWSER"] == nil { self.openBrowser() }
                    self.rebuildMenu()
                }
            }
        }
        // If the server exits on its own, don't leave a dead menu-bar item around.
        proc.terminationHandler = { _ in
            DispatchQueue.main.async { NSApp.terminate(nil) }
        }
        do { try proc.run() } catch { NSLog("PaperVault: failed to start server: \(error)") }
        server = proc
    }

    private func openBrowser() {
        guard let u = URL(string: url) else { return }
        NSWorkspace.shared.open(u)
    }

    private func setupStatusItem() {
        NSApp.setActivationPolicy(.accessory) // menu-bar only, no Dock icon
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            if let img = NSImage(systemSymbolName: "lock.shield", accessibilityDescription: "PaperVault") {
                img.isTemplate = true
                button.image = img
            } else {
                button.title = "PaperVault"
            }
            button.toolTip = "PaperVault"
        }
        rebuildMenu()
    }

    private func rebuildMenu() {
        let menu = NSMenu()
        let header = NSMenuItem(title: url.isEmpty ? "PaperVault — starting…" : "PaperVault is running",
                                action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)
        if !url.isEmpty {
            let open = NSMenuItem(title: "Open in browser", action: #selector(openInBrowser), keyEquivalent: "")
            open.target = self
            menu.addItem(open)
        }
        menu.addItem(.separator())
        let quit = NSMenuItem(title: "Quit PaperVault", action: #selector(quit), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)
        statusItem.menu = menu
    }

    @objc private func openInBrowser() { openBrowser() }

    @objc private func quit() {
        server?.terminate()
        NSApp.terminate(nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        server?.terminate()
    }
}

let app = NSApplication.shared
let delegate = AppController()
app.delegate = delegate
app.run()
