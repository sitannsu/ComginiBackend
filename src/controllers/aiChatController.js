/**
 * POST /api/ai/chat — optional OPENAI_API_KEY for live replies; otherwise a short stub.
 */
const chat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ success: false, message: 'message is required' });
        }
        const key = process.env.OPENAI_API_KEY;
        if (key) {
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You are Comgini assistant for CA practice: clients, compliance, tasks, and projects. Be concise.'
                        },
                        { role: 'user', content: message.trim() }
                    ],
                    max_tokens: 500
                })
            });
            const json = await r.json();
            const reply = json.choices?.[0]?.message?.content?.trim();
            if (reply) {
                return res.json({ success: true, data: { reply } });
            }
        }
        res.json({
            success: true,
            data: {
                reply:
                    'I can help with your projects and compliance. Try asking which project is performing best, or what needs attention this week.'
            }
        });
    } catch (error) {
        console.error('ai chat error:', error);
        res.status(500).json({ success: false, message: 'AI chat failed' });
    }
};

module.exports = { chat };
