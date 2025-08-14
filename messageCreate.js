
const pointsSystem = require('../points-system');
const gamesSystem = require('../games-system');

// دالة تنظيف النص
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/[ء]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        const content = normalizeText(message.content);

        // معالجة الأوامر الكتابية للنقاط
        await handlePointsTextCommands(message, content);
        
        // معالجة الأوامر الكتابية للألعاب
        await handleGamesTextCommands(message, content);
        
        // معالجة رسائل الألعاب النشطة
        if (gamesSystem && gamesSystem.handleGameMessage) {
            await gamesSystem.handleGameMessage(message);
        }
    }
};

async function handlePointsTextCommands(message, content) {
    if (!pointsSystem) return;

    if (content === 'نقده' || content === 'نقدتي' || content === 'رصيدي' || content === 'نقدة') {
        const userCurrentPoints = pointsSystem.getUserPoints(message.author.id);
        const pointsEmbed = {
            color: 0xffd700,
            title: '💰 نقدتك الحالية',
            description: `لديك **${userCurrentPoints.toLocaleString()}** نقدة`,
            thumbnail: { url: message.author.displayAvatarURL({ dynamic: true }) },
            timestamp: new Date()
        };
        await message.reply({ embeds: [pointsEmbed] });
    }

    if (content === 'يوميه' || content === 'يومية') {
        if (!pointsSystem.canClaimDailyReward(message.author.id)) {
            await message.reply('❌ لقد استلمت الجائزة اليومية بالفعل! عد غداً.');
            return;
        }

        const dailyAmount = 100;
        pointsSystem.addUserPoints(message.author.id, dailyAmount);
        pointsSystem.setDailyReward(message.author.id, new Date());

        const dailyEmbed = {
            color: 0xffff00,
            title: '🎁 جائزة يومية!',
            description: `تهانينا! حصلت على **${dailyAmount}** نقدة كجائزة يومية!`,
            timestamp: new Date()
        };
        await message.reply({ embeds: [dailyEmbed] });
    }
}

async function handleGamesTextCommands(message, content) {
    if (!gamesSystem) return;

    if (content === 'قايمه الالعاب' || content === 'الالعاب' || content === 'العاب') {
        const gamesListEmbed = {
            color: 0x9b59b6,
            title: '🎮 قائمة الألعاب',
            description: 'جميع الألعاب المتاحة في البوت',
            fields: [
                { name: '🎲 الألعاب', value: '• تخمين رقم\n• سؤال\n• نرد', inline: true }
            ]
        };
        await message.reply({ embeds: [gamesListEmbed] });
    }
}
