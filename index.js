const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// إعداد البوت
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = '1179133837930938470';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// إعداد Express
const app = express();
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// تحميل المعالجات
async function loadHandlers() {
    try {
        const commandHandler = require('./handlers/commandHandler');
        const eventHandler = require('./handlers/eventHandler');

        await commandHandler.loadCommands(client);
        eventHandler.loadEvents(client);

        console.log('✅ تم تحميل جميع المعالجات بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في تحميل المعالجات:', error);
    }
}

// تسجيل دخول البوت
client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول كـ ${client.user.tag}!`);

    // تحميل المعالجات
    await loadHandlers();

    console.log('🚀 البوت جاهز للعمل!');
});

// تشغيل الخادم والبوت
app.listen(3000, '0.0.0.0', () => {
    console.log('🌐 Web server is running on port 3000');
});

client.login(BOT_TOKEN).catch(console.error);

// تصدير البوت للاستخدام في الملفات الأخرى
module.exports = { client, OWNER_ID };