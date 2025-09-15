// scripts.js
// Communicate with buildfire datastore and Monaco Editor

// Get data from datastore and set editor value
function init(editor, callback) {
	buildfire.datastore.get(function (err, result) {
		if (err) {
			console.error('Error loading data:', err);
			callback && callback(err);
			return;
		}

		buildfire.getContext(function(err, context) {
			if (err) {
				console.error('Error getting context:', err);
				callback && callback(err);
				return;
			}
			
			let html = '';
			let usedDefault = false;
			if (result?.data?.content?.html) {
				html = result.data.content.html;
			} else {
				// Use default template if no HTML is saved
				let scriptSrc = (context && context.endPoints && context.endPoints.pluginRootHost)
					? context.endPoints.pluginRootHost + '/scripts/buildfire.min.js'
					: '';

				html = '<!DOCTYPE html>\n<html>\n  <head></head>\n  <body>\n    <div>Hello Buildfire</div>\n    <script src="' + scriptSrc + '"></script>\n  </body>\n</html>';
				usedDefault = true;
			}

			editor.setValue(html);

			// Restore reload switch state
			let autoReloadSwitch = document.getElementById('autoReloadSwitch');
			if (result?.data?.content) {
				if (typeof result.data.content.autoReload == 'undefined') {
					result.data.content.autoReload = true; // default value
					autoReloadSwitch.checked = true;
				} else {
					autoReloadSwitch.checked = !!result.data.content.autoReload;
				}
			} else {
				autoReloadSwitch.checked = true; // default value
			}

			// Save default value if it was used
			if (usedDefault) {
				saveData({ editor, sendReloadMessage: true });
			}

			callback && callback(null, result);
		});
	});
}

// Save to datastore
function saveData(options) {
	const html = options.editor.getValue();
	const autoReloadSwitch = document.getElementById('autoReloadSwitch');
	const data = {
		content: {
			html: html,
			autoReload: autoReloadSwitch.checked ? true : false,
		}
	};
    if (options.disclaimerAcknowledged) {
        data.content.disclaimerAcknowledged = true;
    }

	buildfire.datastore.save(data, function (err) {
		if (err) {
			console.error('Error saving data:', err);
		} else {
			if (options.sendReloadMessage) {
				buildfire.messaging.sendMessageToWidget({ action: 'reload' });
			}
		}
	});
}

// Always auto-save on editor change
function debounceAutoSave(editor, delay = 500) {
	let timer = null;
	function onChange() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(function () {
			saveData({ editor });
		}, delay);
	}
	editor.onDidChangeModelContent(onChange);
}

// switch "undo" button visibility
function toggleUndoButton(savedHtml) {
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.style.display = savedHtml ? 'block' : 'none';
    }
};

// Monaco Editor dynamic loader and initialization
(function() {
	let baseUrl = window.location.origin + window.location.pathname.replace(/\\/g, '/').replace(/\/[^/]*$/, '/');
	let script = document.createElement('script');
	script.src = baseUrl + 'js/monaco-editor/min/vs/loader.js';
	script.onload = function() {
		require.config({ paths: { 'vs': baseUrl + 'js/monaco-editor/min/vs' } });
		require(['vs/editor/editor.main'], function() {
			window.monacoEditor = monaco.editor.create(document.getElementById('monacoEditor'), {
				value: '', // Remove initialValue logic
				language: 'html',
				theme: 'vs-dark',
				automaticLayout: true
			});
			init(window.monacoEditor, (err, result) => {
                if (!err) {
                    // check for disclaimer acknowledgment
                    let disclaimerAcknowledged = result?.data?.content?.disclaimerAcknowledged;
                    if (!disclaimerAcknowledged) {
                        dialogs.showDisclaimerDialog(() => {
                            saveData({ editor: window.monacoEditor, disclaimerAcknowledged: true });
                        });
                    } else {
                        debounceAutoSave(window.monacoEditor);
                    }
                }
			});
		});
	};
	document.head.appendChild(script);
})();

document.addEventListener('DOMContentLoaded', function() {
    let reloadBtn = document.getElementById('reloadEditorBtn');
	let autoReloadSwitch = document.getElementById('autoReloadSwitch');
    let savedHtml = '';

	reloadBtn.addEventListener('click', function() {
		// send reload message to widget on button click
		buildfire.messaging.sendMessageToWidget({ action: 'reload' });
	});

	// Send message to widget and save when autoReloadSwitch value changes
	autoReloadSwitch.addEventListener('change', function() {
		buildfire.messaging.sendMessageToWidget({ action: 'autoReloadChanged', value: autoReloadSwitch.checked });
		if (window.monacoEditor) {
			saveData({ editor: window.monacoEditor });
		}
	});

	// when widget reload, it needs to know what is the current autoReload value
	buildfire.messaging.onReceivedMessage = function(message) {
		if (message && message.action === 'getAutoReload') {
			let autoReloadSwitch = document.getElementById('autoReloadSwitch');
			let value = !!autoReloadSwitch.checked;
			buildfire.messaging.sendMessageToWidget({ action: 'autoReloadChanged', value: value });
		}
	};

    const createAiBtn = document.getElementById('createAiBtn');
    createAiBtn.addEventListener('click', function () {
        const limit = 10000; // subject to change
        const html = window.monacoEditor.getValue().trim();
        if (html.length >= limit) {
            buildfire.dialog.alert({
            message: "The current HTML content exceeds the 10,000 character limit for AI generation. Please reduce the content size and try again.",
            });
        } else {
            dialogs.showAIDialog({html}, (result) => {
                savedHtml = html;
                if (result) {
                    window.monacoEditor.setValue(result);
                    toggleUndoButton(savedHtml);
                    console.log('AI dialog closed: ', result);
                }
            });
        }
    });
    const undoBtn = document.getElementById('undoBtn');
    undoBtn.addEventListener('click', function () {
        if (savedHtml && window.monacoEditor) {
            window.monacoEditor.setValue(savedHtml);
            savedHtml = '';
        }
        toggleUndoButton(savedHtml);
    });
    toggleUndoButton(savedHtml);
});
