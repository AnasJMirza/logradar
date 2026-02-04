# LogRadar 🎯

The ultimate console statement management tool for JavaScript and TypeScript developers. Clean your codebase, find forgotten logs, and ship production-ready code with confidence.

![LogRadar Demo](https://via.placeholder.com/800x400?text=Add+Screenshot+Here)

## ✨ Features

### 🎨 Smart Highlighting
- **console.log** - Blue highlight
- **console.warn** - Yellow highlight
- **console.error** - Red highlight
- **console.debug/info** - Green highlight
- Real-time updates as you type
- Intelligent detection that ignores comments and strings

### 🔍 Workspace-Wide Analysis
Analyze your entire project in seconds:
- Scan all JavaScript/TypeScript files
- Get detailed statistics by type (log/warn/error/debug)
- See which files have the most console statements
- Excludes build folders (`.next`, `dist`, `node_modules`, etc.)
- Beautiful output panel with sorted results

### 🧹 Powerful Cleanup Tools

**Current File:**
- Remove all console statements
- Remove specific types (only logs, only warns, etc.)
- One-click cleanup

**Entire Workspace:**
- Remove all console statements from every file
- Remove specific types across the entire codebase
- Safe removal with confirmation dialogs
- Detailed results showing modified files
- Automatic file saving

### 📊 Live Statistics
- Status bar shows console count in current file
- Click status bar for detailed breakdown
- Hover for quick stats preview
- Real-time updates

### ⚙️ Fully Customizable
- Toggle highlighting on/off
- Customize colors for each console type
- Configure excluded folders
- Flexible settings via VS Code preferences

### 🎯 Smart Detection
- Ignores console statements in comments
- Ignores console statements in strings
- Works with JavaScript, TypeScript, JSX, and TSX
- Handles multiline statements

## 🚀 Usage

### Automatic Highlighting
Simply open any JavaScript/TypeScript file - LogRadar automatically highlights all console statements with color-coded backgrounds.

### Analyze Your Entire Project
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "LogRadar: Analyze Entire Workspace"
3. View detailed results in the LogRadar output panel

**You'll see:**
- Total files with console statements
- Breakdown by type (log/warn/error/debug)
- List of all files sorted by console count
- Detailed per-file statistics

### Remove Console Statements

**From Current File:**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Choose from:
   - `LogRadar: Remove All Console (Current File)`
   - `LogRadar: Remove console.log (Current File)`
   - `LogRadar: Remove console.warn (Current File)`
   - `LogRadar: Remove console.error (Current File)`
   - `LogRadar: Remove console.debug (Current File)`

**From Entire Workspace:**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Choose from:
   - `LogRadar: Remove All Console (Entire Workspace)`
   - `LogRadar: Remove console.log (Entire Workspace)`
   - `LogRadar: Remove console.warn (Entire Workspace)`
   - `LogRadar: Remove console.error (Entire Workspace)`
   - `LogRadar: Remove console.debug (Entire Workspace)`
3. Confirm the action (⚠️ Make sure you've committed your changes!)
4. Watch the progress and see results

### View Statistics
- **Click the status bar item** (bottom right) to see current file stats
- Or use `Cmd+Shift+P` → "LogRadar: Show Statistics (Current File)"

### Toggle Highlighting
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "LogRadar: Toggle Highlighting"
3. Highlighting will be enabled/disabled

### Customize Settings
1. Open VS Code Settings (`Cmd+,` or `Ctrl+,`)
2. Search for "LogRadar"
3. Customize:
   - Highlighting colors (RGBA values)
   - Excluded folders
   - Enable/disable highlighting

## ⚙️ Configuration

### All Available Settings

```json
{
  // Enable/disable highlighting
  "logradar.enableHighlighting": true,
  
  // Customize colors
  "logradar.logColor": "rgba(0, 123, 255, 0.2)",
  "logradar.logBorderColor": "rgba(0, 123, 255, 0.5)",
  "logradar.warnColor": "rgba(255, 193, 7, 0.2)",
  "logradar.warnBorderColor": "rgba(255, 193, 7, 0.5)",
  "logradar.errorColor": "rgba(220, 53, 69, 0.2)",
  "logradar.errorBorderColor": "rgba(220, 53, 69, 0.5)",
  "logradar.debugColor": "rgba(40, 167, 69, 0.2)",
  "logradar.debugBorderColor": "rgba(40, 167, 69, 0.5)",
  
  // Folders to exclude from workspace analysis
  "logradar.excludeFolders": [
    "node_modules",
    ".next",
    ".vercel",
    "dist",
    "build",
    "out",
    ".nuxt",
    ".output",
    ".cache",
    ".turbo",
    ".git",
    "coverage",
    ".vscode",
    ".idea"
  ]
}
```

### Customizing Excluded Folders

Add or remove folders from workspace scanning:

1. Open Settings → Search "LogRadar"
2. Find "Exclude Folders"
3. Add/remove folder names

This affects both analysis and workspace-wide removal commands.

## 📋 Commands

### Current File Commands
- `LogRadar: Remove All Console (Current File)` - Remove all console statements
- `LogRadar: Remove console.log (Current File)` - Remove only console.log
- `LogRadar: Remove console.warn (Current File)` - Remove only console.warn
- `LogRadar: Remove console.error (Current File)` - Remove only console.error
- `LogRadar: Remove console.debug (Current File)` - Remove only console.debug
- `LogRadar: Show Statistics (Current File)` - View detailed stats
- `LogRadar: Toggle Highlighting` - Enable/disable highlighting

### Workspace Commands
- `LogRadar: Analyze Entire Workspace` - Scan all files and show statistics
- `LogRadar: Remove All Console (Entire Workspace)` - Remove all console statements
- `LogRadar: Remove console.log (Entire Workspace)` - Remove only console.log
- `LogRadar: Remove console.warn (Entire Workspace)` - Remove only console.warn
- `LogRadar: Remove console.error (Entire Workspace)` - Remove only console.error
- `LogRadar: Remove console.debug (Entire Workspace)` - Remove only console.debug

## 🎯 Use Cases

### Before Deploying to Production
```bash
1. Run "Analyze Entire Workspace" to see all console statements
2. Use "Remove console.log (Entire Workspace)" to clean debug logs
3. Keep console.error for production error tracking
4. Ship clean code!
```

### Code Review Preparation
```bash
1. Check which files have the most console statements
2. Clean up debugging artifacts
3. Keep intentional logging
```

### Refactoring Legacy Code
```bash
1. Analyze workspace to understand logging patterns
2. Strategically remove unnecessary logs
3. Modernize your codebase
```

## 📊 Example Output

```
🔍 LogRadar: Analyzing Workspace...

================================================================================

📊 WORKSPACE ANALYSIS RESULTS

📁 Files with console statements: 12
📝 Total console statements: 47

Breakdown by Type:
  📘 console.log:        28
  ⚠️  console.warn:       8
  ❌ console.error:      10
  🐛 console.debug/info: 1

================================================================================

📄 FILES WITH CONSOLE STATEMENTS:

1. src/components/Dashboard.tsx
   Total: 15 | log: 12 | warn: 2 | error: 1 | debug: 0

2. src/utils/api.ts
   Total: 10 | log: 5 | warn: 3 | error: 2 | debug: 0

...
```

## 💡 Pro Tips

1. **Commit before workspace removal** - Always commit your changes to git before using workspace-wide removal commands
2. **Use specific removals** - Remove only console.log in production, keep console.error for monitoring
3. **Configure excludes** - Add your custom build folders to exclude list
4. **Click the status bar** - Quick way to see current file stats
5. **Analyze regularly** - Run workspace analysis before releases

## 🔧 Requirements

- VS Code 1.85.0 or higher
- Works with JavaScript, TypeScript, JSX, and TSX files
- Git recommended for safe workspace-wide operations

## 🐛 Known Issues

None currently! Report issues on [GitHub](https://github.com/anasjmirza/logradar/issues).

## 📝 Release Notes

### 0.2.0 (Latest)
- 🎉 **NEW:** Workspace-wide analysis - scan entire project
- 🎉 **NEW:** Workspace-wide removal - clean entire codebase
- 🎉 **NEW:** Configurable exclude folders
- ✅ Separate removal commands by console type
- ✅ Detailed output panel with statistics
- ✅ Progress notifications
- ✅ Better error handling
- ✅ Improved confirmation dialogs

### 0.1.0
- ✅ Smart highlighting that ignores comments and strings
- ✅ Remove console statements from current file
- ✅ Live statistics in status bar
- ✅ Customizable colors
- ✅ Toggle highlighting on/off
- ✅ Support for console.debug and console.info

### 0.0.1
- Initial release with basic highlighting

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

Visit [GitHub](https://github.com/anasjmirza/logradar) to:
- Report bugs
- Suggest features
- Submit pull requests

## 📧 Contact

- **Portfolio**: [anasjmirza.vercel.app](https://anasjmirza.vercel.app)
- **GitHub**: [@anasjmirza](https://github.com/anasjmirza)
- **Issues**: [GitHub Issues](https://github.com/anasjmirza/logradar/issues)

---

## 🌟 Support the Project

If LogRadar helps you ship cleaner code, consider:
- ⭐ Starring the repo on GitHub
- 📢 Sharing with other developers
- 💬 Leaving a review on the VS Code Marketplace
- ☕ [Buy me a coffee](https://anasjmirza.vercel.app)

---

**Made with ☕ in Pakistan 🇵🇰**

*Helping developers ship production-ready code, one console.log at a time.*