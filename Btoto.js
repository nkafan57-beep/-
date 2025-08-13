const { Client, GatewayIntentBits } = require('discord.js');
const BOT_TOKEN = process.env.BOT_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // اختبار سرعة WebSocket
    console.log(`💓 Ping WebSocket: ${client.ws.ping}ms`);

    // اختبار استجابة بسيطة للـ API
    const start = Date.now();
    client.guilds.fetch()
        .then(() => {
            const latency = Date.now() - start;
            console.log(`⏱️ API fetch guilds time: ${latency}ms`);
        })
        .catch(err => console.log('Error checking API latency:', err));
});

client.login(BOT_TOKEN);
