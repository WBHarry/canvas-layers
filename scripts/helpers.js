export function safeJSONParse(jsonText) {
    try {
        const jsonResult = JSON.parse(jsonText);
        return jsonResult;
    } catch (e) {
        return null;
    }
}