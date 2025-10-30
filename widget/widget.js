// scripts.js
// Redirect to custom content page using buildfire.getContext and datastore check

buildfire.getContext(function(err, context) {
	if (err) {
		console.error('Error getting context:', err);
		return;
	}
	if (context.liveMode === 1) {
		let cmsHost = context.endPoints.cmsHost;
		let url = cmsHost + '/cms/sdk/widget/' + context.appId + '/' + context.pluginId + '/' + context.instanceId + '/primary/' + context.liveMode;
		window.location.href = url + window.location.search + '&isUserCodePlugin=true';
	} else {
		buildfire.datastore.get(function (err, result) {
			if (err) {
				console.error('Error getting datastore:', err);
				return;
			}
			if (result?.data?.content?.html) {
				let cmsHost = context.endPoints.cmsHost;
				let url = cmsHost + '/cms/sdk/widget/' + context.appId + '/' + context.pluginId + '/' + context.instanceId + '/primary/' + context.liveMode;
				window.location.href = url + window.location.search + '&isUserCodePlugin=true';
			} else {
				console.log('No HTML content found in datastore. Not redirecting.');
			}
		});
	}
});

if (window.buildfire && buildfire.messaging) {
	// it would be triggered if live mode is (0) and there is no html content in datastore; so we wait for control side to save default data and then reload 
	buildfire.messaging.onReceivedMessage = function(msg) {
		if (msg && msg.action === 'reloadUserCodePlugin') {
			window.location.reload();
		}
	};
}
