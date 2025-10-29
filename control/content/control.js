// scripts.js
// Communicate with buildfire datastore and Monaco Editor

// Get data from datastore and set editor value
var disclaimerAcknowledged = null;
function init(editor, callback) {
	buildfire.datastore.get(function (err, result) {
		if (err) {
			console.error('Error loading data:', err);
			callback && callback(err);
			return;
		}

		let html = '';
		let usedDefault = false;
		if (result?.data?.content?.html) {
			html = result.data.content.html;
		} else {
			// Use default template if no HTML is saved
			html = getDefaultTemplate();
			usedDefault = true;
		}
		checkBuildfireSDKPresence(html);
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
			saveData({ editor });
			buildfire.messaging.sendMessageToWidget({ action: 'reloadUserCodePlugin' });
		}

		callback && callback(null, result);
	});
}

// Save to datastore
function saveData(options) {
	const html = options.editor.getValue();
	const autoReloadSwitch = document.getElementById('autoReloadSwitch');
	checkBuildfireSDKPresence(html);
	const data = {
		content: {
			html: html,
			autoReload: autoReloadSwitch.checked ? true : false,
			disclaimerAcknowledged: disclaimerAcknowledged
		}
	};
	if (typeof disclaimerAcknowledged == 'boolean') {
		data.content.disclaimerAcknowledged = disclaimerAcknowledged;
	}

	buildfire.datastore.save(data, function (err) {
		if (err) {
			console.error('Error saving data:', err);
		} else {
			if (autoReloadSwitch.checked) {
				buildfire.messaging.sendMessageToWidget({ action: 'reloadUserCodePlugin' });
			}
		}
	});
}

// Always auto-save on editor change
function registerAutoSave(editor, delay = 500) {
	let timer = null;
	function onChange() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(function () {
			saveData({ editor });
		}, delay);
	}
	editor.onDidChangeModelContent(onChange);
}

// TODO: re-enable undo button when AI is ready
// switch "undo" button visibility
// function toggleUndoButtonVisibility(savedHtml) {
// 	const undoBtn = document.getElementById('undoBtn');
// 	if (undoBtn) {
// 		undoBtn.style.display = savedHtml ? 'block' : 'none';
// 	}
// };

// detect if buildfire.min.js || buildfire.js is present in the HTML code, if not show a warning
function checkBuildfireSDKPresence(html) {
	const buildfireNotPresentWarning = document.getElementById('buildfireNotPresentWarning');
	const buildfireScriptRegex = /<\s*script[^>]*src\s*=\s*['"]?(?:\.\.\/){3}scripts\/buildfire(?:\.min)?\.js['"]?[^>]*>/i;

	if (buildfireScriptRegex.test(html)) {
		if (buildfireNotPresentWarning) {
			buildfireNotPresentWarning.style.display = 'none';
		}
	} else {
		if (buildfireNotPresentWarning) {
			buildfireNotPresentWarning.style.display = 'block';
		}
	}
}
// Monaco Editor dynamic loader and initialization
(function () {
	let baseUrl = window.location.origin + window.location.pathname.replace(/\\/g, '/').replace(/\/[^/]*$/, '/');
	let script = document.createElement('script');
	script.src = baseUrl + 'js/monaco-editor/min/vs/loader.js';
	script.onload = function () {
		require.config({ paths: { 'vs': baseUrl + 'js/monaco-editor/min/vs' } });
		require(['vs/editor/editor.main'], function () {
			window.monacoEditor = monaco.editor.create(document.getElementById('monacoEditor'), {
				value: '', // Remove initialValue logic
				language: 'html',
				theme: 'vs-dark',
				automaticLayout: true
			});
			init(window.monacoEditor, (err, result) => {
				if (!err) {
					// check for disclaimer acknowledgment
					disclaimerAcknowledged = result?.data?.content?.disclaimerAcknowledged;
					if (!disclaimerAcknowledged) {
						window.dialogs.showDisclaimerDialog(() => {
							disclaimerAcknowledged = true;
							saveData({ editor: window.monacoEditor });
						});
					}
					registerAutoSave(window.monacoEditor);
				}
			});
		});
	};
	document.head.appendChild(script);
})();

function getDefaultTemplate() {
	const template =
`<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="utf-8" />
    <!-- keep buildfire.min.js in order for the plugin to function correctly -->
    <script src="../../../scripts/buildfire.min.js"></script>
    <script src="../../../scripts/buildfire/components/drawer/drawer.js"></script>
    <style>
        body {
            padding-top: var(--bf-safe-area-inset-top);
        }

        .plugin-container {
            align-items: center;
            display: flex;
            flex-direction: column;
            padding: 10px;
        }

        .buttons-container {
            margin-top: 20vh;
            width: 50vw
        }

        .hidden-before-theme-load {
            visibility: hidden;
        }

        #hiBtn {
            margin-bottom: 20px;
        }
    </style>
</head>

<body class="hidden-before-theme-load visible-after-theme-load">
    <div class="plugin-container">
        <h2>Hello Buildfire</h2>
        <div class="buttons-container">
            <button id="hiBtn" class="btn btn-primary stretch">Say Hi</button>
            <button id="pluginsBtn" class="btn btn-success stretch">Open Plugins</button>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const hiBtn = document.getElementById('hiBtn');
            const pluginsBtn = document.getElementById('pluginsBtn');
            pluginsBtn.style.display = 'none';
            hiBtn.addEventListener('click', function () {
                buildfire.dialog.alert({
                    title: 'Greeting',
                    message: "Hi there!",
                });
            });

            // get all plugin instances
            buildfire.pluginInstance.search({}, function (err, instances) {
                let pluginInstances = [];
                if (err) {
                    console.error(err);
                } else if (instances.result && instances.result.length > 0) {
                    pluginsBtn.style.display = 'block';
                    pluginsBtn.addEventListener('click', function () {
                        pluginInstances = mapPluginInstances(instances.result);

                        buildfire.components.drawer.open(
                            {
                                header: "Navigate to a Plugin",
                                //content: 'Navigate to a Plugin',
                                multiSelection: false,
                                allowSelectAll: false,
                                enableFilter: false,
                                isHTML: true,
                                triggerCallbackOnUIDismiss: false,
                                autoUseImageCdn: true,
                                listItems: pluginInstances,
                            },
                            (err, result) => {
                                if (err) return console.error(err);

                                // handle drawer item selection, navigate to selected plugin instance
                                buildfire.navigation.navigateTo({
                                    instanceId: result.id,
                                });
                                buildfire.components.drawer.closeDrawer();
                            }
                        );
                    });
                }
            });
            // return array of mapped plugin instances that maps to drawer listItems structure
            function mapPluginInstances(pluginInstances) {
                let mappedPluginInstances = [];
                for (let i = 0; i < pluginInstances.length; i++) {
                    mappedPluginInstances.push({
                        text: pluginInstances[i].data.title,
                        imageUrl: pluginInstances[i].data.iconUrl,
                        id: pluginInstances[i].data.instanceId
                    });
                }
                return mappedPluginInstances;
            }
        });
    </script>
</body>

</html>`;

	return template;
}

document.addEventListener('load', function () {
	let reloadBtn = document.getElementById('reloadEditorBtn');
	let autoReloadSwitch = document.getElementById('autoReloadSwitch');

	reloadBtn.addEventListener('click', function () {
		// send reload message to widget on button click
		buildfire.messaging.sendMessageToWidget({ action: 'reloadUserCodePlugin' });
	});

	// Send message to widget and save when autoReloadSwitch value changes
	autoReloadSwitch.addEventListener('change', function () {
		if (window.monacoEditor) {
			saveData({ editor: window.monacoEditor });
		}
	});
	// TODO: re-enable AI button when ready
	// const createAiBtn = document.getElementById('createAiBtn');
	// createAiBtn.addEventListener('click', function () {
	//     const html = window.monacoEditor.getValue().trim();
	//         dialogs.showAIDialog({html}, (err, result) => {
	//             if (err) {
	//                 buildfire.dialog.alert({
	//                 message: err,
	//                 });
	//             } else {
	//                 savedHtml = html;
	//                 if (result) {
	//                     window.monacoEditor.setValue(result);
	//                     toggleUndoButtonVisibility(savedHtml);
	//                 }
	//             }
	//         });
	// });
	// const undoBtn = document.getElementById('undoBtn');
	// undoBtn.addEventListener('click', function () {
	//     if (savedHtml && window.monacoEditor) {
	//         window.monacoEditor.setValue(savedHtml);
	//         savedHtml = '';
	//     }
	//     toggleUndoButtonVisibility(savedHtml);
	// });
	// toggleUndoButtonVisibility(savedHtml);
});
