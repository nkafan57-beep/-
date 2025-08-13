
const { SlashCommandBuilder, Client, MessageFlags } = require('discord.js');

// معرف صاحب البوت
const OWNER_ID = '1179133837930938470';

// قاعدة بيانات النقاط (في الذاكرة)
const userPoints = new Map();
const dailyRewards = new Map();
const weeklyRewards = new Map();
const monthlyRewards = new Map();

// دوال إدارة النقاط
function getUserPoints(userId) {
    return userPoints.get(userId) || 0;
}

function setUserPoints(userId, points) {
    userPoints.set(userId, points);
}

function addUserPoints(userId, points) {
    const currentPoints = getUserPoints(userId);
    setUserPoints(userId, currentPoints + points);
}

function canClaimDailyReward(userId) {
    const lastClaim = dailyRewards.get(userId);
    if (!lastClaim) return true;
    const now = new Date();
    const lastClaimDate = new Date(lastClaim);
    return now.toDateString() !== lastClaimDate.toDateString();
}

function canClaimWeeklyReward(userId) {
    const lastClaim = weeklyRewards.get(userId);
    if (!lastClaim) return true;
    const now = new Date();
    const lastClaimDate = new Date(lastClaim);
    const daysDiff = Math.floor((now - lastClaimDate) / (1000 * 60 * 60 * 24));
    return daysDiff >= 7;
}

function canClaimMonthlyReward(userId) {
    const lastClaim = monthlyRewards.get(userId);
    if (!lastClaim) return true;
    const now = new Date();
    const lastClaimDate = new Date(lastClaim);
    return now.getMonth() !== lastClaimDate.getMonth() || now.getFullYear() !== lastClaimDate.getFullYear();
}

// أوامر النقدة
const pointsCommands = [
    new SlashCommandBuilder()
        .setName('نقدة')
        .setDescription('عرض نقدتك الحالية'),

    new SlashCommandBuilder()
        .setName('تحويل')
        .setDescription('تحويل نقدة لشخص آخر')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد التحويل له')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('المبلغ')
                .setDescription('عدد النقدة المراد تحويلها')
                .setRequired(true)
                .setMinValue(1)),

    new SlashCommandBuilder()
        .setName('اعطاء')
        .setDescription('إعطاء نقدة لشخص (خاص بصاحب البوت)')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد إعطاؤه النقدة')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('المبلغ')
                .setDescription('عدد النقدة المراد إعطاؤها')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('نقطة')
        .setDescription('عرض نقدة شخص آخر')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد عرض نقدته')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('يومية')
        .setDescription('استلام الجائزة اليومية'),

    new SlashCommandBuilder()
        .setName('اسبوعية')
        .setDescription('استلام الجائزة الأسبوعية'),

    new SlashCommandBuilder()
        .setName('شهرية')
        .setDescription('استلام الجائزة الشهرية'),

    new SlashCommandBuilder()
        .setName('حساب-ضريبة')
        .setDescription('حساب الضريبة المطلوبة للتحويل')
        .addIntegerOption(option =>
            option.setName('المبلغ')
                .setDescription('المبلغ المراد تحويله')
                .setRequired(true)
                .setMinValue(1)),
];

// دالة معالجة أوامر النقاط
async function handlePointsCommand(interaction) {
    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'نقدة':
                const userCurrentPoints = getUserPoints(interaction.user.id);
                const pointsEmbed = {
                    color: 0xffd700,
                    title: '💰 نقدتك الحالية',
                    description: `لديك **${userCurrentPoints.toLocaleString()}** نقدة`,
                    thumbnail: { url: interaction.user.displayAvatarURL({ dynamic: true }) },
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [pointsEmbed] });
                break;

            case 'تحويل':
                const recipientTransfer = interaction.options.getUser('الشخص');
                const transferAmount = interaction.options.getInteger('المبلغ');
                const senderPoints = getUserPoints(interaction.user.id);
                
                if (recipientTransfer.id === interaction.user.id) {
                    await interaction.reply({ content: '❌ لا يمكنك تحويل النقدة لنفسك!', flags: MessageFlags.Ephemeral });
                    return;
                }
                
                // حساب الضريبة الثابتة 6%
                const feePercentage = 6;
                const fee = Math.floor((transferAmount * feePercentage) / 100);
                const totalRequired = transferAmount + fee;
                
                if (senderPoints < totalRequired) {
                    await interaction.reply({ content: `❌ ليس لديك نقدة كافية! تحتاج ${totalRequired.toLocaleString()} نقدة (${transferAmount.toLocaleString()} + ${fee.toLocaleString()} رسوم) ولديك ${senderPoints.toLocaleString()} نقدة فقط.`, flags: MessageFlags.Ephemeral });
                    return;
                }
                
                addUserPoints(interaction.user.id, -totalRequired);
                addUserPoints(recipientTransfer.id, transferAmount);
                
                const transferEmbed = {
                    color: 0x00ff00,
                    title: '✅ تم التحويل بنجاح',
                    description: `تم تحويل **${transferAmount.toLocaleString()}** نقدة إلى ${recipientTransfer}`,
                    fields: [
                        { name: '👤 المرسل', value: `${interaction.user.tag}`, inline: true },
                        { name: '👤 المستقبل', value: `${recipientTransfer.tag}`, inline: true },
                        { name: '💰 المبلغ المحول', value: `${transferAmount.toLocaleString()} نقدة`, inline: true },
                        { name: '💸 رسوم التحويل', value: `${fee.toLocaleString()} نقدة (${feePercentage}%)`, inline: true },
                        { name: '💳 إجمالي المخصوم', value: `${totalRequired.toLocaleString()} نقدة`, inline: true },
                        { name: '💰 رصيدك الجديد', value: `${getUserPoints(interaction.user.id).toLocaleString()} نقدة`, inline: true }
                    ],
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [transferEmbed] });
                break;

            case 'اعطاء':
                if (interaction.user.id !== OWNER_ID) {
                    const ownerOnlyEmbed = {
                        color: 0xff0000,
                        title: '❌ غير مسموح',
                        description: 'هذا الأمر خاص بصانع البوت فقط!',
                        timestamp: new Date()
                    };
                    await interaction.reply({ embeds: [ownerOnlyEmbed], flags: MessageFlags.Ephemeral });
                    return;
                }
                
                const recipientGive = interaction.options.getUser('الشخص');
                const giveAmount = interaction.options.getInteger('المبلغ');
                
                addUserPoints(recipientGive.id, giveAmount);
                
                const giveEmbed = {
                    color: 0x9932cc,
                    title: '👑 تم إعطاء النقدة بنجاح',
                    description: `تم إعطاء **${giveAmount.toLocaleString()}** نقدة إلى ${recipientGive}`,
                    fields: [
                        { name: '👤 المستقبل', value: `${recipientGive.tag}`, inline: true },
                        { name: '💰 النقدة المضافة', value: `${giveAmount.toLocaleString()} نقدة`, inline: true },
                        { name: '💳 رصيده الجديد', value: `${getUserPoints(recipientGive.id).toLocaleString()} نقدة`, inline: true }
                    ],
                    footer: { text: 'أمر صاحب البوت' },
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [giveEmbed] });
                break;

            case 'نقطة':
                const targetUserPoints = interaction.options.getUser('الشخص');
                const targetPoints = getUserPoints(targetUserPoints.id);
                
                const checkPointsEmbed = {
                    color: 0x00bfff,
                    title: `💰 نقدة ${targetUserPoints.username}`,
                    description: `${targetUserPoints} لديه **${targetPoints.toLocaleString()}** نقدة`,
                    thumbnail: { url: targetUserPoints.displayAvatarURL({ dynamic: true }) },
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [checkPointsEmbed] });
                break;

            case 'يومية':
                if (!canClaimDailyReward(interaction.user.id)) {
                    await interaction.reply({ content: '❌ لقد استلمت الجائزة اليومية بالفعل! عد غداً.', flags: MessageFlags.Ephemeral });
                    return;
                }
                
                const dailyAmount = 100;
                addUserPoints(interaction.user.id, dailyAmount);
                dailyRewards.set(interaction.user.id, new Date());
                
                const dailyEmbed = {
                    color: 0xffff00,
                    title: '🎁 جائزة يومية!',
                    description: `تهانينا! حصلت على **${dailyAmount}** نقدة كجائزة يومية!`,
                    fields: [
                        { name: '💰 النقدة المضافة', value: `${dailyAmount} نقدة`, inline: true },
                        { name: '💳 رصيدك الجديد', value: `${getUserPoints(interaction.user.id).toLocaleString()} نقدة`, inline: true }
                    ],
                    footer: { text: 'عد غداً للحصول على جائزة أخرى!' },
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [dailyEmbed] });
                break;

            case 'اسبوعية':
                if (!canClaimWeeklyReward(interaction.user.id)) {
                    await interaction.reply({ content: '❌ لقد استلمت الجائزة الأسبوعية بالفعل! عد الأسبوع القادم.', flags: MessageFlags.Ephemeral });
                    return;
                }
                
                const weeklyAmount = 1000;
                addUserPoints(interaction.user.id, weeklyAmount);
                weeklyRewards.set(interaction.user.id, new Date());
                
                const weeklyEmbed = {
                    color: 0x32cd32,
                    title: '🎁 جائزة أسبوعية!',
                    description: `تهانينا! حصلت على **${weeklyAmount}** نقدة كجائزة أسبوعية!`,
                    fields: [
                        { name: '💰 النقدة المضافة', value: `${weeklyAmount} نقدة`, inline: true },
                        { name: '💳 رصيدك الجديد', value: `${getUserPoints(interaction.user.id).toLocaleString()} نقدة`, inline: true }
                    ],
                    footer: { text: 'عد الأسبوع القادم للحصول على جائزة أخرى!' },
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [weeklyEmbed] });
                break;

            case 'شهرية':
                if (!canClaimMonthlyReward(interaction.user.id)) {
                    await interaction.reply({ content: '❌ لقد استلمت الجائزة الشهرية بالفعل! عد الشهر القادم.', flags: MessageFlags.Ephemeral });
                    return;
                }
                
                const monthlyAmount = 5000;
                addUserPoints(interaction.user.id, monthlyAmount);
                monthlyRewards.set(interaction.user.id, new Date());
                
                const monthlyEmbed = {
                    color: 0xff6347,
                    title: '🎁 جائزة شهرية!',
                    description: `تهانينا! حصلت على **${monthlyAmount}** نقدة كجائزة شهرية!`,
                    fields: [
                        { name: '💰 النقدة المضافة', value: `${monthlyAmount} نقدة`, inline: true },
                        { name: '💳 رصيدك الجديد', value: `${getUserPoints(interaction.user.id).toLocaleString()} نقدة`, inline: true }
                    ],
                    footer: { text: 'عد الشهر القادم للحصول على جائزة أخرى!' },
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [monthlyEmbed] });
                break;

            case 'حساب-ضريبة':
                const amountToCalculate = interaction.options.getInteger('المبلغ');
                const calculatedFee = Math.floor((amountToCalculate * 6) / 100);
                const totalRequiredForCalculation = amountToCalculate + calculatedFee;
                
                const calculationEmbed = {
                    color: 0x3498db,
                    title: '🧮 حساب الضريبة',
                    description: `حساب الضريبة للمبلغ المطلوب تحويله`,
                    fields: [
                        { name: '💰 المبلغ المراد تحويله', value: `${amountToCalculate.toLocaleString()} نقدة`, inline: true },
                        { name: '💸 الضريبة (6%)', value: `${calculatedFee.toLocaleString()} نقدة`, inline: true },
                        { name: '💳 إجمالي المطلوب', value: `${totalRequiredForCalculation.toLocaleString()} نقدة`, inline: true }
                    ],
                    footer: { text: 'الضريبة ثابتة 6% على جميع التحويلات' },
                    timestamp: new Date()
                };
                await interaction.reply({ embeds: [calculationEmbed] });
                break;

            default:
                return false; // لم يتم التعامل مع الأمر
        }
        return true; // تم التعامل مع الأمر
    } catch (error) {
        console.error('خطأ في نظام النقاط:', error);
        throw error;
    }
}

// دوال إضافية للأوامر الكتابية
function setDailyReward(userId, date) {
    dailyRewards.set(userId, date);
}

function setWeeklyReward(userId, date) {
    weeklyRewards.set(userId, date);
}

function setMonthlyReward(userId, date) {
    monthlyRewards.set(userId, date);
}

// تصدير الوحدة
module.exports = {
    pointsCommands,
    handlePointsCommand,
    getUserPoints,
    addUserPoints,
    setUserPoints,
    canClaimDailyReward,
    canClaimWeeklyReward,
    canClaimMonthlyReward,
    setDailyReward,
    setWeeklyReward,
    setMonthlyReward
};
