var dialogs = {
    showDisclaimerDialog: function (callback) {
        function closeDialog() {
            if (callback) callback();
            if (backdrop) {
                document.body.removeChild(backdrop);
            }
            if (dialogContainer) {
                document.body.removeChild(dialogContainer);
            }
        }

        const backdrop = document.createElement('div');
        backdrop.classList.add('dialog-backdrop');

        const dialogContainer = document.createElement('div');
        dialogContainer.classList.add('dialog-container');
        dialogContainer.innerHTML = `
                <div class="dialog">
                    <div class="dialog-header">
                        <div class="dialog-title">Create Your Own Plugin</div>
                    </div>
                    <div class="dialog-body">
                        <p>
                            With this plugin, you can insert custom code to achieve solutions that go beyond Buildfire standard features to create something uniquely you. Please note that code that runs in the emulator is not guaranteed to perform the same in-app.
                        </p>
                        <br/>
                        <p class="italic">
                            Buildfire does not review, test, or guarantee the performance or security of custom code. By using this plugin, you accept full responsibility for its behavior.
                        </p>
                        <br>
                        <div class="form-group">
                            <div class="checkbox checkbox-info">
                                <input type="checkbox" id="disclaimerCheckbox">
                                <label for="disclaimerCheckbox">
                                    I understand and agree to the terms of use
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <button class="dialog-action" id="startCodingBtn" disabled>Start Coding</button>
                    </div>
                </div>    
            `;

        document.body.appendChild(backdrop);
        document.body.appendChild(dialogContainer);

        const checkbox = dialogContainer.querySelector('#disclaimerCheckbox');
        const startBtn = dialogContainer.querySelector('#startCodingBtn');
        if (checkbox && startBtn) {
            checkbox.addEventListener('change', function () {
                startBtn.disabled = !checkbox.checked;
            });
            startBtn.addEventListener('click', function () {
                closeDialog();
            });
        }
    },

    showAIDialog: function (options, callback) {
        const limit = 10000;
        showDialog();

        function closeDialog(result) {
            const backdrop = document.getElementById('aiDialogBackdrop');
            const dialogContainer = document.getElementById('aiDialogContainer');
            if (callback) callback(null, result);
            if (backdrop) {
                document.body.removeChild(backdrop);
            }
            if (dialogContainer) {
                document.body.removeChild(dialogContainer);
            }
        }

        function showDialog() {
            const backdrop = document.createElement('div');
            backdrop.classList.add('dialog-backdrop');
            backdrop.id = 'aiDialogBackdrop';

            const dialogContainer = document.createElement('div');
            dialogContainer.classList.add('dialog-container');
            dialogContainer.id = 'aiDialogContainer';
            dialogContainer.innerHTML = `
                    <div class="dialog ai-dialog">
                        <div class="dialog-header">
                            <div class="dialog-title">What are you looking to create?</div>
                            <span class="icon icon-cross2 close-icon" aria-label="Close dialog"></span>
                        </div>
                        <div class="dialog-body">
                            <textarea class="ai-prompt" rows="6" placeholder="Describe your plugin here..."></textarea>
                            <div class="create-ai-container">
                                <button id="generateAiBtn" class="btn create-ai-btn">
                                    <img src="../../resources/ai_icon.svg" alt="">
                                    Create with AI
                                </button>
                            </div>
                            <div class="ai-examples-title">Examples of Prompts</div>
                            <ul class="ai-examples hide-scrollbar">
                                <li>Build a to-do list plugin with add, edit, and delete functionalities.</li>
                                <li>Create a weather plugin that fetches data from a public API and displays current weather conditions.</li>
                                <li>Develop a simple blog plugin that allows users to create, edit, and delete blog posts.</li>
                                <li>Design a photo gallery plugin that displays images in a grid layout with lightbox functionality.</li>
                                <li>Implement a contact form plugin that sends form submissions to a specified email address.</li>
                                <li>Create a countdown timer plugin that counts down to a specific date and time.</li>
                                <li>Build a quiz plugin that presents multiple-choice questions and provides feedback on answers.</li>
                                <li>Develop a recipe plugin that allows users to submit and view cooking recipes.</li>
                                <li>Design a testimonials plugin that displays user reviews in a carousel format.</li>
                                <li>Implement a pricing table plugin that showcases different subscription plans.</li>
                            </ul>
                        </div>
                    </div>    
                `;

            document.body.appendChild(backdrop);
            document.body.appendChild(dialogContainer);

            const generateAiBtn = dialogContainer.querySelector('#generateAiBtn');
            const aiPrompt = dialogContainer.querySelector('.ai-prompt');
            aiPrompt.focus();

            generateAiBtn.addEventListener('click', function () {
                if (!aiPrompt || !aiPrompt.value || !aiPrompt.value.trim().length) {
                    buildfire.dialog.alert({
                        message: "Please enter a prompt for AI generation.",
                    });
                    return;
                }
                const userMessage = options.html + '\n\n' + aiPrompt.value;
                if (userMessage.length >= limit) {
                    buildfire.dialog.alert({
                        message: "prompt exceed the character limit for AI generation. Please reduce size and try again.",
                    });
                    return;
                }
                generateAICode({ userMessage }, (err, res) => {
                    if (err || !res) {
                        buildfire.dialog.alert({
                            message: "Error generating AI response.",
                        });
                        return;
                    }
                    closeDialog(res);
                });
            });

            const closeIcon = dialogContainer.querySelector('.close-icon');
            if (closeIcon) {
                closeIcon.addEventListener('click', function () {
                    closeDialog();
                });
            }

            // Add click listeners to all example <li> items
            const exampleItems = dialogContainer.querySelectorAll('.ai-examples li');
            exampleItems.forEach(function (item) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', function () {
                    aiPrompt.value = item.textContent;
                    aiPrompt.focus();
                });
            });

        }
    }
};