const conversation = new buildfire.ai.conversation();

function generateAICode(options, callback) {
    const systemMessage = 
    `You are an expert web developer. Generate HTML code snippets based on user requests.
    Output only raw HTML — no Markdown formatting, no code blocks, and no additional explanation. Do not remove any <script> tag that includes "buildfire.min.js" in the src attribute.`;
    conversation.systemSays(systemMessage);

    conversation.userSays(options.userMessage);
    conversation.fetchTextResponse({}, (err, res) => {
        if (err) return callback(err);

        if (!res || !res.data || !res.data.choices || !res.data.choices.length || !res.data.choices[0].message || !res.data.choices[0].message.content || 
            !_extractHtmlContent(res.data.choices[0].message.content) || _extractHtmlContent(res.data.choices[0].message.content).length === 0
        ) {
            return callback('No response from AI');
        }
        const aiResponse = _extractHtmlContent(res.data.choices[0].message.content);
        conversation.clear();
        callback(null, aiResponse);
    })
}

function _extractHtmlContent(htmlString) {
  // Remove everything before <!DOCTYPE html> or <html>
  let result = htmlString.replace(/^[\s\S]*?(<!DOCTYPE html>|<html>)/i, '$1');

  // Remove everything after </html>
  result = result.replace(/(<\/html>)[\s\S]*$/i, '$1');

  return result;
}