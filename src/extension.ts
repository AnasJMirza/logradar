import * as vscode from 'vscode';
import * as path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

let logDecoration: vscode.TextEditorDecorationType;
let warnDecoration: vscode.TextEditorDecorationType;
let errorDecoration: vscode.TextEditorDecorationType;
let debugDecoration: vscode.TextEditorDecorationType;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

interface FileStats {
    filePath: string;
    log: number;
    warn: number;
    error: number;
    debug: number;
    total: number;
}

interface WorkspaceStats {
    totalFiles: number;
    totalStatements: number;
    log: number;
    warn: number;
    error: number;
    debug: number;
    files: FileStats[];
}

let currentCounts = {
    log: 0,
    warn: 0,
    error: 0,
    debug: 0
};

export function activate(context: vscode.ExtensionContext) {
    console.log('LogRadar is now active!');

    // Create output channel
    outputChannel = vscode.window.createOutputChannel('LogRadar');
    context.subscriptions.push(outputChannel);

    updateDecorations();

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'logradar.showStatistics';
    context.subscriptions.push(statusBarItem);

    // Event listeners
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                highlightConsole(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                highlightConsole(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('logradar')) {
                updateDecorations();
                if (vscode.window.activeTextEditor) {
                    highlightConsole(vscode.window.activeTextEditor);
                }
            }
        })
    );

    registerCommands(context);

    if (vscode.window.activeTextEditor) {
        highlightConsole(vscode.window.activeTextEditor);
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    // Current file commands
    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeAllConsole', () => {
            removeConsoleStatementsFromFile(['log', 'warn', 'error', 'debug', 'info']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeConsoleLogs', () => {
            removeConsoleStatementsFromFile(['log']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeConsoleWarns', () => {
            removeConsoleStatementsFromFile(['warn']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeConsoleErrors', () => {
            removeConsoleStatementsFromFile(['error']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeConsoleDebugs', () => {
            removeConsoleStatementsFromFile(['debug', 'info']);
        })
    );

    // Workspace-wide commands
    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.analyzeWorkspace', async () => {
            await analyzeWorkspace();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeAllFromWorkspace', async () => {
            await removeFromWorkspace(['log', 'warn', 'error', 'debug', 'info']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeLogsFromWorkspace', async () => {
            await removeFromWorkspace(['log']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeWarnsFromWorkspace', async () => {
            await removeFromWorkspace(['warn']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeErrorsFromWorkspace', async () => {
            await removeFromWorkspace(['error']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.removeDebugsFromWorkspace', async () => {
            await removeFromWorkspace(['debug', 'info']);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.toggleHighlighting', () => {
            const config = vscode.workspace.getConfiguration('logradar');
            const currentState = config.get('enableHighlighting', true);
            config.update('enableHighlighting', !currentState, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(
                `LogRadar highlighting ${!currentState ? 'enabled' : 'disabled'}`
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('logradar.showStatistics', () => {
            const total = currentCounts.log + currentCounts.warn + currentCounts.error + currentCounts.debug;
            
            if (total === 0) {
                vscode.window.showInformationMessage('No console statements found in current file');
                return;
            }

            const message = `Console Statistics (Current File):\n\n` +
                `📘 console.log: ${currentCounts.log}\n` +
                `⚠️ console.warn: ${currentCounts.warn}\n` +
                `❌ console.error: ${currentCounts.error}\n` +
                `🐛 console.debug/info: ${currentCounts.debug}\n\n` +
                `Total: ${total} statement${total > 1 ? 's' : ''}`;

            vscode.window.showInformationMessage(message, { modal: false });
        })
    );
}

function getExcludePattern(): string {
    const config = vscode.workspace.getConfiguration('logradar');
    const excludeFolders = config.get<string[]>('excludeFolders', [
        'node_modules',
        '.next',
        '.vercel',
        'dist',
        'build',
        'out',
        '.nuxt',
        '.output',
        '.cache',
        '.turbo',
        '.git',
        'coverage',
        '.vscode',
        '.idea'
    ]);
    
    return `**/{${excludeFolders.join(',')}}/**`;
}

function getParserPlugins(filePath: string): any[] {
    const ext = path.extname(filePath);
    const plugins: any[] = ['jsx'];
    
    if (ext === '.ts' || ext === '.tsx') {
        plugins.push('typescript');
    }
    
    return plugins;
}

async function analyzeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open!');
        return;
    }

    const excludePattern = getExcludePattern();

    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine('🔍 LogRadar: Analyzing Workspace...\n');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine(`Excluding folders: ${excludePattern}\n`);
    outputChannel.appendLine('='.repeat(80));

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "LogRadar: Analyzing workspace",
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0, message: "Scanning files..." });

        const stats: WorkspaceStats = {
            totalFiles: 0,
            totalStatements: 0,
            log: 0,
            warn: 0,
            error: 0,
            debug: 0,
            files: []
        };

        const files = await vscode.workspace.findFiles(
            '**/*.{js,ts,jsx,tsx}',
            excludePattern
        );

        progress.report({ increment: 10, message: `Found ${files.length} files` });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();

                const fileStats = analyzeFileContentWithAST(text, file.fsPath);
                
                if (fileStats.total > 0) {
                    stats.files.push(fileStats);
                    stats.totalFiles++;
                    stats.totalStatements += fileStats.total;
                    stats.log += fileStats.log;
                    stats.warn += fileStats.warn;
                    stats.error += fileStats.error;
                    stats.debug += fileStats.debug;
                }
            } catch (error) {
                console.error(`Error reading file ${file.fsPath}:`, error);
            }

            if (i % 10 === 0) {
                progress.report({ 
                    increment: (90 / files.length) * 10,
                    message: `Analyzed ${i}/${files.length} files` 
                });
            }
        }

        progress.report({ increment: 100, message: "Analysis complete!" });

        displayWorkspaceStats(stats);
    });
}

function analyzeFileContentWithAST(text: string, filePath: string): FileStats {
    const stats: FileStats = {
        filePath,
        log: 0,
        warn: 0,
        error: 0,
        debug: 0,
        total: 0
    };

    try {
        const plugins = getParserPlugins(filePath);
        const ast = parser.parse(text, {
            sourceType: 'module',
            plugins: plugins,
            errorRecovery: true
        });

        traverse(ast, {
            CallExpression(path) {
                const callee = path.node.callee;
                
                // Check if it's console.X()
                if (
                    callee.type === 'MemberExpression' &&
                    callee.object.type === 'Identifier' &&
                    callee.object.name === 'console' &&
                    callee.property.type === 'Identifier'
                ) {
                    const method = callee.property.name;
                    
                    switch (method) {
                        case 'log':
                            stats.log++;
                            break;
                        case 'warn':
                            stats.warn++;
                            break;
                        case 'error':
                            stats.error++;
                            break;
                        case 'debug':
                        case 'info':
                            stats.debug++;
                            break;
                    }
                    stats.total++;
                }
            }
        });
    } catch (error) {
        // If AST parsing fails, fall back to regex
        console.error(`AST parsing failed for ${filePath}, using regex fallback:`, error);
        return analyzeFileContentWithRegex(text, filePath);
    }

    return stats;
}

function analyzeFileContentWithRegex(text: string, filePath: string): FileStats {
    const stats: FileStats = {
        filePath,
        log: 0,
        warn: 0,
        error: 0,
        debug: 0,
        total: 0
    };

    const lines = text.split('\n');
    
    lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
            return;
        }

        const consoleRegex = /console\.(log|warn|error|debug|info)/g;
        let match;

        while ((match = consoleRegex.exec(line)) !== null) {
            const matchIndex = match.index;
            const beforeMatch = line.substring(0, matchIndex);
            const singleQuotes = (beforeMatch.match(/'/g) || []).length;
            const doubleQuotes = (beforeMatch.match(/"/g) || []).length;
            const backticks = (beforeMatch.match(/`/g) || []).length;

            if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
                continue;
            }

            switch (match[1]) {
                case 'log':
                    stats.log++;
                    break;
                case 'warn':
                    stats.warn++;
                    break;
                case 'error':
                    stats.error++;
                    break;
                case 'debug':
                case 'info':
                    stats.debug++;
                    break;
            }
            stats.total++;
        }
    });

    return stats;
}

function displayWorkspaceStats(stats: WorkspaceStats) {
    outputChannel.appendLine('\n📊 WORKSPACE ANALYSIS RESULTS\n');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine(`\n📁 Files with console statements: ${stats.totalFiles}`);
    outputChannel.appendLine(`📝 Total console statements: ${stats.totalStatements}\n`);
    
    outputChannel.appendLine('Breakdown by Type:');
    outputChannel.appendLine(`  📘 console.log:        ${stats.log}`);
    outputChannel.appendLine(`  ⚠️  console.warn:       ${stats.warn}`);
    outputChannel.appendLine(`  ❌ console.error:      ${stats.error}`);
    outputChannel.appendLine(`  🐛 console.debug/info: ${stats.debug}`);
    
    if (stats.totalFiles === 0) {
        outputChannel.appendLine('\n' + '='.repeat(80));
        outputChannel.appendLine('\n✨ No console statements found! Your codebase is clean.\n');
        vscode.window.showInformationMessage('✨ No console statements found in workspace!');
        return;
    }

    outputChannel.appendLine('\n' + '='.repeat(80));
    outputChannel.appendLine('\n📄 FILES WITH CONSOLE STATEMENTS:\n');

    stats.files.sort((a, b) => b.total - a.total);

    stats.files.forEach((file, index) => {
        const relativePath = vscode.workspace.asRelativePath(file.filePath);
        outputChannel.appendLine(`${index + 1}. ${relativePath}`);
        outputChannel.appendLine(`   Total: ${file.total} | log: ${file.log} | warn: ${file.warn} | error: ${file.error} | debug: ${file.debug}`);
        outputChannel.appendLine('');
    });

    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('\n💡 Tip: Use "LogRadar: Remove [type] from Workspace" commands to clean up!');
    outputChannel.appendLine('⚙️  Tip: Configure excluded folders in Settings → LogRadar → Exclude Folders\n');

    vscode.window.showInformationMessage(
        `Found ${stats.totalStatements} console statements in ${stats.totalFiles} files`,
        'View Details'
    ).then(selection => {
        if (selection === 'View Details') {
            outputChannel.show();
        }
    });
}

async function removeFromWorkspace(types: string[]) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open!');
        return;
    }

    const typeNames = types.map(t => `console.${t}`).join(', ');
    const answer = await vscode.window.showWarningMessage(
        `⚠️ Remove ${typeNames} from ENTIRE workspace?\n\nThis will modify all your source files and cannot be undone!\n\nMake sure you have committed your changes to git first.`,
        { modal: true },
        'Yes, Remove',
        'Cancel'
    );

    if (answer !== 'Yes, Remove') {
        return;
    }

    const excludePattern = getExcludePattern();

    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine(`🧹 LogRadar: Removing ${typeNames} from workspace...\n`);
    outputChannel.appendLine('='.repeat(80));

    let totalRemoved = 0;
    let filesModified = 0;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `LogRadar: Removing ${typeNames}`,
        cancellable: false
    }, async (progress) => {
        const files = await vscode.workspace.findFiles(
            '**/*.{js,ts,jsx,tsx}',
            excludePattern
        );

        progress.report({ increment: 0, message: `Processing ${files.length} files...` });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();

                const result = removeConsoleStatementsWithAST(text, types, file.fsPath);

                if (result.count > 0) {
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(text.length)
                    );
                    edit.replace(file, fullRange, result.code);
                    
                    await vscode.workspace.applyEdit(edit);
                    await document.save();

                    totalRemoved += result.count;
                    filesModified++;

                    const relativePath = vscode.workspace.asRelativePath(file.fsPath);
                    outputChannel.appendLine(`✅ ${relativePath} - Removed ${result.count} statement(s)`);
                }
            } catch (error) {
                const relativePath = vscode.workspace.asRelativePath(file.fsPath);
                outputChannel.appendLine(`❌ ${relativePath} - Error: ${error}`);
            }

            if (i % 10 === 0) {
                progress.report({ 
                    increment: (100 / files.length) * 10,
                    message: `Processed ${i}/${files.length} files` 
                });
            }
        }
    });

    outputChannel.appendLine('\n' + '='.repeat(80));
    outputChannel.appendLine(`\n✅ Complete! Removed ${totalRemoved} statements from ${filesModified} files\n`);

    if (totalRemoved > 0) {
        vscode.window.showInformationMessage(
            `✅ Removed ${totalRemoved} ${typeNames} statements from ${filesModified} files!`,
            'View Details'
        ).then(selection => {
            if (selection === 'View Details') {
                outputChannel.show();
            }
        });
    } else {
        vscode.window.showInformationMessage(`No ${typeNames} statements found in workspace!`);
    }
}

function removeConsoleStatementsWithAST(code: string, types: string[], filePath: string): { code: string; count: number } {
    let count = 0;
    
    try {
        const plugins = getParserPlugins(filePath);
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: plugins,
            errorRecovery: true
        });

        traverse(ast, {
            ExpressionStatement(path: { node: { expression: any; }; remove: () => void; }) {
                const expression = path.node.expression;
                
                // Check if it's a console statement
                if (
                    expression.type === 'CallExpression' &&
                    expression.callee.type === 'MemberExpression' &&
                    expression.callee.object.type === 'Identifier' &&
                    expression.callee.object.name === 'console' &&
                    expression.callee.property.type === 'Identifier'
                ) {
                    const method = expression.callee.property.name;
                    
                    if (types.includes(method)) {
                        path.remove();
                        count++;
                    }
                }
            }
        });

        const output = generate(ast, {
            retainLines: true,
            compact: false
        });

        return { code: output.code, count };
    } catch (error) {
        console.error(`AST removal failed for ${filePath}:`, error);
        // Fallback to regex if AST fails
        return removeConsoleStatementsWithRegex(code, types);
    }
}

function removeConsoleStatementsWithRegex(code: string, types: string[]): { code: string; count: number } {
    const typesPattern = types.join('|');
    const regex = new RegExp(
        `[ \\t]*console\\.(${typesPattern})\\([^)]*\\);?[ \\t]*\\r?\\n?`,
        'g'
    );
    
    const matches = code.match(regex);
    const count = matches ? matches.length : 0;
    const newCode = code.replace(regex, '');
    
    return { code: newCode, count };
}

function removeConsoleStatementsFromFile(types: string[]) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No file open!');
        return;
    }

    const document = editor.document;
    const text = document.getText();
    
    const result = removeConsoleStatementsWithAST(text, types, document.fileName);

    if (result.count === 0) {
        const typeNames = types.map(t => `console.${t}`).join(', ');
        vscode.window.showInformationMessage(`No ${typeNames} statements found!`);
        return;
    }

    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
    );
    
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, result.code);
    }).then(success => {
        if (success) {
            const typeNames = types.length === 1 ? `console.${types[0]}` : 'console';
            vscode.window.showInformationMessage(`✅ Removed ${result.count} ${typeNames} statement${result.count > 1 ? 's' : ''}!`);
        }
    });
}

function updateDecorations() {
    const config = vscode.workspace.getConfiguration('logradar');

    if (logDecoration) { logDecoration.dispose(); }
    if (warnDecoration) { warnDecoration.dispose(); }
    if (errorDecoration) { errorDecoration.dispose(); }
    if (debugDecoration) { debugDecoration.dispose(); }

    logDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: config.get('logColor', 'rgba(0, 123, 255, 0.2)'),
        border: `1px solid ${config.get('logBorderColor', 'rgba(0, 123, 255, 0.5)')}`
    });

    warnDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: config.get('warnColor', 'rgba(255, 193, 7, 0.2)'),
        border: `1px solid ${config.get('warnBorderColor', 'rgba(255, 193, 7, 0.5)')}`
    });

    errorDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: config.get('errorColor', 'rgba(220, 53, 69, 0.2)'),
        border: `1px solid ${config.get('errorBorderColor', 'rgba(220, 53, 69, 0.5)')}`
    });

    debugDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: config.get('debugColor', 'rgba(40, 167, 69, 0.2)'),
        border: `1px solid ${config.get('debugBorderColor', 'rgba(40, 167, 69, 0.5)')}`
    });
}

function highlightConsole(editor: vscode.TextEditor) {
    const config = vscode.workspace.getConfiguration('logradar');
    const enabled = config.get('enableHighlighting', true);

    if (!enabled) {
        editor.setDecorations(logDecoration, []);
        editor.setDecorations(warnDecoration, []);
        editor.setDecorations(errorDecoration, []);
        editor.setDecorations(debugDecoration, []);
        statusBarItem.hide();
        return;
    }

    const text = editor.document.getText();
    const logRanges: vscode.Range[] = [];
    const warnRanges: vscode.Range[] = [];
    const errorRanges: vscode.Range[] = [];
    const debugRanges: vscode.Range[] = [];

    try {
        const plugins = getParserPlugins(editor.document.fileName);
        const ast = parser.parse(text, {
            sourceType: 'module',
            plugins: plugins,
            errorRecovery: true
        });

        traverse(ast, {
            CallExpression(path: { node: { callee: any; }; }) {
                const callee = path.node.callee;
                
                if (
                    callee.type === 'MemberExpression' &&
                    callee.object.type === 'Identifier' &&
                    callee.object.name === 'console' &&
                    callee.property.type === 'Identifier' &&
                    callee.loc
                ) {
                    const method = callee.property.name;
                    const start = callee.loc.start;
                    const end = callee.loc.end;
                    
                    const startPos = new vscode.Position(start.line - 1, start.column);
                    const endPos = new vscode.Position(end.line - 1, end.column);
                    const range = new vscode.Range(startPos, endPos);

                    switch (method) {
                        case 'log':
                            logRanges.push(range);
                            break;
                        case 'warn':
                            warnRanges.push(range);
                            break;
                        case 'error':
                            errorRanges.push(range);
                            break;
                        case 'debug':
                        case 'info':
                            debugRanges.push(range);
                            break;
                    }
                }
            }
        });
    } catch (error) {
        // Fallback to regex highlighting if AST parsing fails
        highlightConsoleWithRegex(editor);
        return;
    }

    currentCounts = {
        log: logRanges.length,
        warn: warnRanges.length,
        error: errorRanges.length,
        debug: debugRanges.length
    };

    editor.setDecorations(logDecoration, logRanges);
    editor.setDecorations(warnDecoration, warnRanges);
    editor.setDecorations(errorDecoration, errorRanges);
    editor.setDecorations(debugDecoration, debugRanges);

    const totalCount = logRanges.length + warnRanges.length + errorRanges.length + debugRanges.length;
    if (totalCount > 0) {
        statusBarItem.text = `$(debug-console) ${totalCount} console`;
        statusBarItem.tooltip = `📘 log: ${logRanges.length} | ⚠️ warn: ${warnRanges.length} | ❌ error: ${errorRanges.length} | 🐛 debug: ${debugRanges.length}\n\nClick for details`;
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

function highlightConsoleWithRegex(editor: vscode.TextEditor) {
    const text = editor.document.getText();
    const logRanges: vscode.Range[] = [];
    const warnRanges: vscode.Range[] = [];
    const errorRanges: vscode.Range[] = [];
    const debugRanges: vscode.Range[] = [];

    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
            return;
        }

        const consoleRegex = /console\.(log|warn|error|debug|info)/g;
        let match;

        while ((match = consoleRegex.exec(line)) !== null) {
            const matchIndex = match.index;
            
            const beforeMatch = line.substring(0, matchIndex);
            const singleQuotes = (beforeMatch.match(/'/g) || []).length;
            const doubleQuotes = (beforeMatch.match(/"/g) || []).length;
            const backticks = (beforeMatch.match(/`/g) || []).length;

            if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
                continue;
            }

            const startPos = new vscode.Position(lineIndex, matchIndex);
            const endPos = new vscode.Position(lineIndex, matchIndex + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            switch (match[1]) {
                case 'log':
                    logRanges.push(range);
                    break;
                case 'warn':
                    warnRanges.push(range);
                    break;
                case 'error':
                    errorRanges.push(range);
                    break;
                case 'debug':
                case 'info':
                    debugRanges.push(range);
                    break;
            }
        }
    });

    currentCounts = {
        log: logRanges.length,
        warn: warnRanges.length,
        error: errorRanges.length,
        debug: debugRanges.length
    };

    editor.setDecorations(logDecoration, logRanges);
    editor.setDecorations(warnDecoration, warnRanges);
    editor.setDecorations(errorDecoration, errorRanges);
    editor.setDecorations(debugDecoration, debugRanges);

    const totalCount = logRanges.length + warnRanges.length + errorRanges.length + debugRanges.length;
    if (totalCount > 0) {
        statusBarItem.text = `$(debug-console) ${totalCount} console`;
        statusBarItem.tooltip = `📘 log: ${logRanges.length} | ⚠️ warn: ${warnRanges.length} | ❌ error: ${errorRanges.length} | 🐛 debug: ${debugRanges.length}\n\nClick for details`;
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}