const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const express = require('express');
const app = express();

// توكن البوت من متغيرات البيئة
const BOT_TOKEN = process.env.TOKEN;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// معرف صاحب البوت - ضع معرفك هنا
const OWNER_ID = '1179133837930938470'; // غير هذا إلى معرف حسابك

// قائمة البوتات المسموح لها بالدخول
const WHITELISTED_BOTS = [
    '1179133837930938470', // البوت الحالي
    // أضف معرفات البوتات المسموح لها هنا
];

// استيراد نظام النقاط والألعاب والتكتات والتوثيق واللغة ونظام الحماية
const pointsSystem = require('./points-system');
const gamesSystem = require('./games-system');
const ticketSystem = require('./ticket-system');
const verificationSystem = require('./verification-system');
const languageSystem = require('./language-system');
const BotProtection = require('./bot-protection');
const SecurityMonitor = require('./security-monitor');
const DataEncryption = require('./data-encryption');

// دالة إرسال إشعار للمالك
async function notifyOwner(message) {
    try {
        const owner = await client.users.fetch(OWNER_ID);
        await owner.send(message);
    } catch (error) {
        console.log('فشل في إرسال إشعار للمالك:', error.message);
    }
}

// دالة زخرفة النصوص
function decorateText(text) {
    const decorations = [
        // زخرفة إنجليزية
        text.split('').map(char => {
            const decoratedChars = {
                'a': '𝒶', 'b': '𝒷', 'c': '𝒸', 'd': '𝒹', 'e': '𝑒', 'f': '𝒻', 'g': '𝑔', 'h': '𝒽', 'i': '𝒾', 'j': '𝒿',
                'k': '𝓀', 'l': '𝓁', 'm': '𝓂', 'n': '𝓃', 'o': '𝑜', 'p': '𝓅', 'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉',
                'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍', 'y': '𝓎', 'z': '𝓏',
                'A': '𝒜', 'B': '𝐵', 'C': '𝒞', 'D': '𝒟', 'E': '𝐸', 'F': '𝐹', 'G': '𝒢', 'H': '𝐻', 'I': '𝐼', 'J': '𝒥',
                'K': '𝒦', 'L': '𝐿', 'M': '𝑀', 'N': '𝒩', 'O': '𝒪', 'P': '𝒫', 'Q': '𝒬', 'R': '𝑅', 'S': '𝒮', 'T': '𝒯',
                'U': '𝒰', 'V': '𝒱', 'W': '𝒲', 'X': '𝒳', 'Y': '𝒴', 'Z': '𝒵'
            };
            return decoratedChars[char] || char;
        }).join(''),

        // زخرفة بالرموز
        `★彡 ${text} 彡★`,
        `♕ ${text} ♕`,
        `◄ ${text} ►`,
        `▬▬ι═══════ﺤ ${text} ﺤ═══════ι▬▬`,
        `๑°⌨ ${text} ⌨°๑`,
        `••.•´¯\`•.•• ${text} ••.•´¯\`•.••`,
        `❁ ${text} ❁`,

        // زخرفة عربية
        text.split('').map(char => `${char}ۦ`).join(''),
        `『${text}』`,
        `【${text}】`
    ];

    return decorations;
}

// أوامر البوت
const commands = [
    ...pointsSystem.pointsCommands,
    ...gamesSystem.gamesCommands,
    ...ticketSystem.ticketCommands,
    ...verificationSystem.verificationCommands,
    ...languageSystem.languageCommands,
    new SlashCommandBuilder()
        .setName('انشاء')
        .setDescription('إنشاء روم جديد')
        .addStringOption(option =>
            option.setName('اسم_الروم')
                .setDescription('اسم الروم الجديد')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('نوع_الروم')
                .setDescription('نوع الروم')
                .setRequired(true)
                .addChoices(
                    { name: 'شات', value: 'text' },
                    { name: 'فويس', value: 'voice' }
                ))
        .addChannelOption(option =>
            option.setName('الكاتاجوري')
                .setDescription('الكاتاجوري المراد إضافة الروم إليه')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('مقفل')
                .setDescription('هل الروم مقفل؟')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('رتبة')
        .setDescription('إنشاء رتبة جديدة')
        .addStringOption(option =>
            option.setName('اسم_الرتبة')
                .setDescription('اسم الرتبة الجديدة')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('لون_الرتبة')
                .setDescription('لون الرتبة (hex code مثل #ff0000)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('حذف-رتبة')
        .setDescription('حذف رتبة')
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('الرتبة المراد حذفها')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('اعطاء-رتبة')
        .setDescription('إعطاء رتبة لشخص')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد إعطاؤه الرتبة')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('الرتبة المراد إعطاؤها')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('ازالة-رتبة')
        .setDescription('إزالة رتبة من شخص')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد إزالة الرتبة منه')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('الرتبة المراد إزالتها')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('مسح')
        .setDescription('حذف رسائل')
        .addIntegerOption(option =>
            option.setName('العدد')
                .setDescription('عدد الرسائل المراد حذفها')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('حذف رسائل شخص معين (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('اسم-مستعار')
        .setDescription('تغيير اسم مستعار لشخص')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد تغيير اسمه')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الاسم_الجديد')
                .setDescription('الاسم المستعار الجديد')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    new SlashCommandBuilder()
        .setName('ارسل')
        .setDescription('إرسال رسالة خاصة لشخص')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد إرساله له')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسالة')
                .setDescription('الرسالة المراد إرسالها')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('هل تريد منشن الشخص في الرسالة؟')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('سبام')
                .setDescription('هل تريد إرسال الرسالة عدة مرات بسرعة؟')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('عدد_الرسائل')
                .setDescription('عدد الرسائل للسبام (إذا كان السبام مفعل)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20))
        .addIntegerOption(option =>
            option.setName('سرعة_السبام')
                .setDescription('السرعة بالميلي ثانية بين الرسائل (أقل = أسرع)')
                .setRequired(false)
                .setMinValue(100)
                .setMaxValue(5000))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ارسال')
        .setDescription('إرسال رسالة خاصة لعدد معين من الأشخاص')
        .addIntegerOption(option =>
            option.setName('عدد_الاشخاص')
                .setDescription('عدد الأشخاص المراد الإرسال لهم')
                .setRequired(true)
                .setMinValue(1))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('هل تريد منشن الأشخاص في الرسالة؟')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسالة')
                .setDescription('الرسالة المراد إرسالها')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('زخرفة')
        .setDescription('زخرفة النصوص')
        .addStringOption(option =>
            option.setName('النص')
                .setDescription('النص المراد زخرفته')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('حذف_روم')
        .setDescription('حذف روم')
        .addChannelOption(option =>
            option.setName('الروم')
                .setDescription('الروم المراد حذفه')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('معلومات_العضو')
        .setDescription('إظهار معلومات عضو')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد عرض معلوماته')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('منع')
        .setDescription('منع عضو من السيرفر')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد منعه')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('السبب')
                .setDescription('سبب المنع')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('باند')
        .setDescription('طرد عضو من السيرفر')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('الشخص المراد طرده')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('السبب')
                .setDescription('سبب الطرد')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('سبام-فويس')
        .setDescription('سبام دخول وخروج البوت من روم الصوت')
        .addChannelOption(option =>
            option.setName('روم_الصوت')
                .setDescription('روم الصوت المراد عمل سبام فيه')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice))
        .addIntegerOption(option =>
            option.setName('عدد_المرات')
                .setDescription('عدد مرات الدخول والخروج')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(50))
        .addIntegerOption(option =>
            option.setName('سرعة_السبام')
                .setDescription('السرعة بالميلي ثانية (أقل = أسرع)')
                .setRequired(false)
                .setMinValue(100)
                .setMaxValue(3000))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),


];

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول كـ ${client.user.tag}!`);

    // تشغيل نظام الحماية المتقدم
    const protection = new BotProtection(client);
    protection.startProtection();
    protection.simulateHumanActivity();
    protection.hideApplicationInfo();
    protection.encryptCacheData();
    protection.cleanupTraces();
    protection.maskBotIdentity();
    
    // تشغيل نظام المراقبة الأمنية
    const securityMonitor = new SecurityMonitor(client, OWNER_ID);
    const dataEncryption = new DataEncryption();
    
    // حفظ مراجع الأنظمة للاستخدام لاحقاً
    client.protection = protection;
    client.securityMonitor = securityMonitor;
    client.dataEncryption = dataEncryption;

    // تشغيل نظام مراقبة التكتات
    ticketSystem.startInactivityMonitoring(client);

    // تسجيل الأوامر
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

    try {
        console.log('بدء تحديث أوامر التطبيق (/)...');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log('تم تحديث أوامر التطبيق (/) بنجاح!');
    } catch (error) {
        console.error(error);
    }
});

// معالج إنشاء القنوات الجديدة للتكتات
client.on('channelCreate', async (channel) => {
    try {
        await ticketSystem.handleChannelCreate(channel);
    } catch (error) {
        console.error('خطأ في معالجة إنشاء القناة:', error);
    }
});

// إشعار عند دخول البوت لسيرفر جديد مع حماية متقدمة
client.on('guildCreate', async (guild) => {
    try {
        // تأخير أولي لتجنب الكشف المبكر
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 5000));
        
        // فحص أمني شامل
        let securityStatus = 'آمن';
        let securityLevel = 0;
        
        if (client.protection) {
            const hasSecurityBots = await client.protection.detectAndAvoidSecurityBots(guild);
            
            if (hasSecurityBots) {
                securityStatus = '🔴 خطر عالي - بوتات أمنية متقدمة';
                securityLevel = 3;
                
                // إجراءات طوارئ
                console.log('⚠️ تم اكتشاف تهديد أمني - تفعيل وضع الحماية المتقدمة');
                
                // إخفاء فوري وتأجيل أي أنشطة
                await client.user.setPresence({
                    activities: [],
                    status: 'invisible'
                });
                
                // عدم إرسال إشعار فوري للمالك لتجنب الأنماط المشبوهة
                setTimeout(async () => {
                    const guildInfo = `🔴 **تحذير أمني!**\n\n` +
                        `📋 **السيرفر:** ${guild.name}\n` +
                        `🆔 **المعرف:** ${guild.id}\n` +
                        `👥 **الأعضاء:** ${guild.memberCount}\n` +
                        `🔒 **الحالة:** ${securityStatus}\n` +
                        `⚠️ **تم تفعيل وضع الحماية المتقدمة**`;
                    await notifyOwner(guildInfo);
                }, Math.random() * 300000 + 600000); // 10-15 دقيقة تأخير
                
                return;
            } else {
                securityStatus = '✅ آمن';
            }
        }
        
        // إشعار عادي للسيرفرات الآمنة (مع تأخير)
        setTimeout(async () => {
            const guildInfo = `🆕 **دخل البوت لسيرفر جديد!**\n\n` +
                `📋 **اسم السيرفر:** ${guild.name}\n` +
                `🆔 **معرف السيرفر:** ${guild.id}\n` +
                `👥 **عدد الأعضاء:** ${guild.memberCount}\n` +
                `👑 **صاحب السيرفر:** <@${guild.ownerId}>\n` +
                `📅 **تاريخ الإنشاء:** ${guild.createdAt.toLocaleDateString('ar-SA')}\n` +
                `🌐 **المنطقة:** ${guild.preferredLocale || 'غير محدد'}\n` +
                `🔒 **الحالة الأمنية:** ${securityStatus}`;

            await notifyOwner(guildInfo);
        }, Math.random() * 60000 + 30000); // 30-90 ثانية تأخير
        
    } catch (error) {
        console.error('خطأ في معالجة دخول السيرفر:', error);
        // في حالة خطأ، تفعيل وضع الطوارئ
        if (client.protection) {
            await client.protection.emergencyStealthMode();
        }
    }
});

// معالج دخول عضو جديد
client.on('guildMemberAdd', async (member) => {
    try {
        // فحص البوتات أولاً
        if (member.user.bot) {
            // التحقق من القائمة البيضاء
            if (!WHITELISTED_BOTS.includes(member.id)) {
                try {
                    // إرسال تنبيه للمالك
                    const botWarningEmbed = {
                        color: 0xff0000,
                        title: '🚨 تحذير أمني - بوت غير مصرح',
                        description: `تم اكتشاف بوت غير مصرح به في السيرفر`,
                        fields: [
                            { name: '🤖 اسم البوت', value: member.user.tag, inline: true },
                            { name: '🆔 المعرف', value: member.id, inline: true },
                            { name: '🏠 السيرفر', value: member.guild.name, inline: true },
                            { name: '👑 صاحب السيرفر', value: `<@${member.guild.ownerId}>`, inline: true },
                            { name: '📅 وقت الدخول', value: new Date().toLocaleString('ar-SA'), inline: true },
                            { name: '⚡ الإجراء المتخذ', value: 'تم الحظر تلقائياً', inline: true }
                        ],
                        thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) },
                        footer: { text: 'نظام الحماية التلقائي' },
                        timestamp: new Date()
                    };

                    await notifyOwner(`🚨 **تحذير أمني!**\n\n🤖 **بوت غير مصرح:** ${member.user.tag}\n🆔 **المعرف:** ${member.id}\n🏠 **السيرفر:** ${member.guild.name}\n⚡ **تم الحظر تلقائياً**`);

                    // حظر البوت فوراً
                    await member.ban({ 
                        reason: 'نظام الحماية التلقائي - بوت غير مصرح به',
                        deleteMessageDays: 1
                    });

                    console.log(`🚫 تم حظر بوت غير مصرح: ${member.user.tag} (${member.id})`);
                    
                    // إرسال رسالة في قناة عامة إذا أمكن
                    const logChannel = member.guild.channels.cache.find(channel => 
                        channel.name.includes('log') || channel.name.includes('أمان') || channel.type === 0
                    );
                    
                    if (logChannel && logChannel.permissionsFor(member.guild.members.me)?.has('SendMessages')) {
                        await logChannel.send({
                            embeds: [botWarningEmbed]
                        });
                    }

                } catch (banError) {
                    console.error(`فشل في حظر البوت ${member.user.tag}:`, banError);
                    await notifyOwner(`❌ **فشل في حظر البوت!**\n\n🤖 **البوت:** ${member.user.tag}\n🆔 **المعرف:** ${member.id}\n❗ **الخطأ:** ${banError.message}`);
                }
            } else {
                console.log(`✅ بوت مصرح به دخل السيرفر: ${member.user.tag}`);
                await notifyOwner(`✅ **بوت مصرح دخل السيرفر**\n\n🤖 **البوت:** ${member.user.tag}\n🏠 **السيرفر:** ${member.guild.name}`);
            }
        } else {
            // فحص ذكي للأعضاء العاديين (قد يكونوا بوتات متخفية)
            const suspectPatterns = ['bot', 'system', 'ai', 'mod', 'auto', 'log', 'نظام', 'بوت', 'تلقائي'];
            const username = member.user.username.toLowerCase();
            const displayName = member.displayName?.toLowerCase() || '';
            
            const isSuspicious = suspectPatterns.some(pattern => 
                username.includes(pattern) || displayName.includes(pattern)
            );

            if (isSuspicious) {
                const suspiciousEmbed = {
                    color: 0xffaa00,
                    title: '⚠️ تحذير - عضو مشبوه',
                    description: `تم اكتشاف عضو قد يكون بوت متنكر`,
                    fields: [
                        { name: '👤 اسم المستخدم', value: member.user.tag, inline: true },
                        { name: '🆔 المعرف', value: member.id, inline: true },
                        { name: '🏠 السيرفر', value: member.guild.name, inline: true },
                        { name: '📅 تاريخ إنشاء الحساب', value: member.user.createdAt.toLocaleDateString('ar-SA'), inline: true },
                        { name: '🔍 سبب الشك', value: `اسم مشبوه: ${member.user.username}`, inline: true }
                    ],
                    thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) },
                    footer: { text: 'يرجى التحقق يدوياً' },
                    timestamp: new Date()
                };

                await notifyOwner(`⚠️ **عضو مشبوه!**\n\n👤 **العضو:** ${member.user.tag}\n🆔 **المعرف:** ${member.id}\n🏠 **السيرفر:** ${member.guild.name}\n🔍 **السبب:** اسم مشبوه`);
                
                console.log(`⚠️ عضو مشبوه: ${member.user.tag} - ${member.id}`);
            }

            // معالجة الأعضاء العاديين بنظام التوثيق
            await verificationSystem.handleNewMember(member);
        }
    } catch (error) {
        console.error('خطأ في معالجة العضو الجديد:', error);
        await notifyOwner(`❌ **خطأ في نظام المراقبة**\n\n📋 **التفاصيل:** ${error.message}`);
    }
});

// دالة تنظيف النص (إزالة الهمزات والمسافات الزائدة)
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

// معالج الرسائل الكتابية مع حماية متقدمة
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // تطبيق تأخير بشري قبل المعالجة
    if (client.protection) {
        const delay = client.protection.getHumanDelay(message.channel.id);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // محاكاة كتابة قبل الرد
        await client.protection.humanLikeResponse(message.channel, Math.random() * 1000 + 500);
    }

    // التحقق من الرسائل الخاصة
    if (message.channel.type === 1) { // DM Channel
        // إذا كانت الرسالة من المالك، إرسالها للشخص الذي رد عليه آخر مرة
        if (message.author.id === OWNER_ID) {
            // البحث عن آخر مستخدم تفاعل معه البوت من خلال الرسائل الأخيرة
            const messages = await message.channel.messages.fetch({ limit: 50 });
            let targetUserId = null;
            
            // البحث عن آخر رسالة تم تحويلها من مستخدم
            for (const [, msg] of messages) {
                if (msg.author.id === client.user.id && msg.content.includes('من:')) {
                    const userIdMatch = msg.content.match(/\((\d+)\)/);
                    if (userIdMatch) {
                        targetUserId = userIdMatch[1];
                        break;
                    }
                }
            }
            
            if (targetUserId) {
                try {
                    const targetUser = await client.users.fetch(targetUserId);
                    await targetUser.send(message.content);
                    await message.reply(`✅ تم إرسال ردك إلى ${targetUser.tag}`);
                } catch (error) {
                    await message.reply(`❌ فشل في إرسال الرسالة إلى المستخدم`);
                }
            } else {
                await message.reply(`❌ لم أتمكن من العثور على المستخدم للرد عليه. تأكد من وجود محادثة سابقة.`);
            }
            return;
        } else {
            // إذا كانت الرسالة من مستخدم آخر، إرسالها للمالك كما هي
            try {
                const owner = await client.users.fetch(OWNER_ID);
                await owner.send(`من: ${message.author.tag} (${message.author.id})\n\n${message.content}`);
                
                // رد تلقائي للمرسل
                await message.reply('تم استلام رسالتك وتحويلها. سيتم الرد عليك قريباً.');
            } catch (error) {
                console.error('خطأ في تحويل الرسالة الخاصة:', error);
            }
            return;
        }
    }

    const content = normalizeText(message.content);

    // أوامر النقدة الكتابية
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
        return;
    }

    if (content.startsWith('نقطه ') || content.startsWith('نقده ') || content.startsWith('نقطة ') || content.startsWith('نقدة ')) {
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser) {
            const targetPoints = pointsSystem.getUserPoints(mentionedUser.id);
            const checkPointsEmbed = {
                color: 0x00bfff,
                title: `💰 نقدة ${mentionedUser.username}`,
                description: `${mentionedUser} لديه **${targetPoints.toLocaleString()}** نقدة`,
                thumbnail: { url: mentionedUser.displayAvatarURL({ dynamic: true }) },
                timestamp: new Date()
            };
            await message.reply({ embeds: [checkPointsEmbed] });
        }
        return;
    }

    if (content === 'يوميه' || content === 'جايزه يوميه' || content === 'يومية' || content === 'جائزة يومية') {
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
            fields: [
                { name: '💰 النقدة المضافة', value: `${dailyAmount} نقدة`, inline: true },
                { name: '💳 رصيدك الجديد', value: `${pointsSystem.getUserPoints(message.author.id).toLocaleString()} نقدة`, inline: true }
            ],
            footer: { text: 'عد غداً للحصول على جائزة أخرى!' },
            timestamp: new Date()
        };
        await message.reply({ embeds: [dailyEmbed] });
        return;
    }

    if (content === 'اسبوعيه' || content === 'جايزه اسبوعيه' || content === 'اسبوعية' || content === 'جائزة اسبوعية') {
        if (!pointsSystem.canClaimWeeklyReward(message.author.id)) {
            await message.reply('❌ لقد استلمت الجائزة الأسبوعية بالفعل! عد الأسبوع القادم.');
            return;
        }

        const weeklyAmount = 1000;
        pointsSystem.addUserPoints(message.author.id, weeklyAmount);
        pointsSystem.setWeeklyReward(message.author.id, new Date());

        const weeklyEmbed = {
            color: 0x32cd32,
            title: '🎁 جائزة أسبوعية!',
            description: `تهانينا! حصلت على **${weeklyAmount}** نقدة كجائزة أسبوعية!`,
            fields: [
                { name: '💰 النقدة المضافة', value: `${weeklyAmount} نقدة`, inline: true },
                { name: '💳 رصيدك الجديد', value: `${pointsSystem.getUserPoints(message.author.id).toLocaleString()} نقدة`, inline: true }
            ],
            footer: { text: 'عد الأسبوع القادم للحصول على جائزة أخرى!' },
            timestamp: new Date()
        };
        await message.reply({ embeds: [weeklyEmbed] });
        return;
    }

    if (content === 'شهريه' || content === 'جايزه شهريه' || content === 'شهرية' || content === 'جائزة شهرية') {
        if (!pointsSystem.canClaimMonthlyReward(message.author.id)) {
            await message.reply('❌ لقد استلمت الجائزة الشهرية بالفعل! عد الشهر القادم.');
            return;
        }

        const monthlyAmount = 5000;
        pointsSystem.addUserPoints(message.author.id, monthlyAmount);
        pointsSystem.setMonthlyReward(message.author.id, new Date());

        const monthlyEmbed = {
            color: 0xff6347,
            title: '🎁 جائزة شهرية!',
            description: `تهانينا! حصلت على **${monthlyAmount}** نقدة كجائزة شهرية!`,
            fields: [
                { name: '💰 النقدة المضافة', value: `${monthlyAmount} نقدة`, inline: true },
                { name: '💳 رصيدك الجديد', value: `${pointsSystem.getUserPoints(message.author.id).toLocaleString()} نقدة`, inline: true }
            ],
            footer: { text: 'عد الشهر القادم للحصول على جائزة أخرى!' },
            timestamp: new Date()
        };
        await message.reply({ embeds: [monthlyEmbed] });
        return;
    }

    // أوامر الألعاب الكتابية
    if (content === 'قايمه الالعاب' || content === 'الالعاب' || content === 'العاب' || content === 'قائمة الألعاب' || content === 'الألعاب') {
        const gamesListEmbed = {
            color: 0x9b59b6,
            title: '🎮 قائمة الألعاب الجماعية',
            description: 'جميع الألعاب المتاحة للعب في البوت:',
            fields: [
                {
                    name: '🎲 ألعاب التخمين',
                    value: '• `تخمين رقم` - خمن الرقم الصحيح\n• `كلمة سر` - احزر الكلمة\n• `تخمين ايموجي` - خمن معنى الإيموجي',
                    inline: true
                },
                {
                    name: '🧠 ألعاب الذكاء',
                    value: '• `سؤال` - أسئلة ثقافية\n• `ذاكرة` - احفظ التسلسل\n• `من الأسرع` - أجب بسرعة',
                    inline: true
                },
                {
                    name: '⚡ ألعاب السرعة',
                    value: '• `سباق كلمات` - اكتب بسرعة\n• `ترتيب أرقام` - رتب بسرعة\n• `ألوان` - احفظ التسلسل',
                    inline: true
                },
                {
                    name: '⚙️ أوامر التحكم',
                    value: '• `إنهاء اللعبة` - إنهاء اللعبة الحالية\n• `إحصائيات` - عرض الإحصائيات',
                    inline: true
                }
            ],
            footer: { text: 'استمتع باللعب مع أصدقائك!' },
            timestamp: new Date()
        };
        await message.reply({ embeds: [gamesListEmbed] });
        return;
    }

    if (content.includes('تخمين') && content.includes('رقم') || content === 'لعبه تخمين رقم' || content === 'لعبة تخمين رقم' || content === 'تخمين') {
        const args = message.content.split(' ');
        const min = parseInt(args[2]) || 1;
        const max = parseInt(args[3]) || 100;

        if (gamesSystem.activeGames.has(message.channel.id)) {
            await message.reply('❌ هناك لعبة نشطة بالفعل في هذه القناة! اكتب `إنهاء اللعبة` لإنهائها أولاً.');
            return;
        }

        const targetNumber = Math.floor(Math.random() * (max - min + 1)) + min;

        gamesSystem.activeGames.set(message.channel.id, {
            type: 'number-guess',
            targetNumber,
            minNum: min,
            maxNum: max,
            attempts: 0,
            players: new Set(),
            startTime: Date.now()
        });

        const numberGameEmbed = {
            color: 0x3498db,
            title: '🎲 لعبة تخمين الرقم',
            description: `تم اختيار رقم بين **${min}** و **${max}**\nاكتب تخمينك في المحادثة!`,
            fields: [
                { name: '🎯 الهدف', value: 'اكتب الرقم الصحيح لتفوز!', inline: true },
                { name: '⏱️ الوقت', value: 'لا يوجد حد زمني', inline: true },
                { name: '👥 اللاعبون', value: 'متعدد اللاعبين', inline: true }
            ],
            footer: { text: 'اكتب رقماً في المحادثة للمشاركة!' },
            timestamp: new Date()
        };
        await message.reply({ embeds: [numberGameEmbed] });
        return;
    }

    if (content === 'سوال' || content === 'لعبه سوال' || content === 'سوال ثقافي' || content === 'سؤال' || content === 'لعبة سؤال' || content === 'سؤال ثقافي') {
        if (gamesSystem.activeGames.has(message.channel.id)) {
            await message.reply('❌ هناك لعبة نشطة بالفعل في هذه القناة!');
            return;
        }

        const categories = ['general', 'history', 'science', 'sports', 'geography'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const questions = {
            general: [
                { question: 'ما هي عاصمة السعودية؟', answers: ['الرياض', 'رياض'], correct: 'الرياض' },
                { question: 'كم عدد قارات العالم؟', answers: ['7', 'سبعة', 'سبع'], correct: '7' },
                { question: 'ما هو أكبر محيط في العالم؟', answers: ['الهادئ', 'المحيط الهادئ'], correct: 'الهادئ' }
            ],
            history: [
                { question: 'من هو أول خليفة راشدي؟', answers: ['أبو بكر الصديق', 'ابو بكر', 'أبو بكر'], correct: 'أبو بكر الصديق' },
                { question: 'في أي عام سقطت الدولة العثمانية؟', answers: ['1922', '١٩٢٢'], correct: '1922' }
            ],
            science: [
                { question: 'ما هو الرمز الكيميائي للذهب؟', answers: ['Au', 'AU'], correct: 'Au' },
                { question: 'كم عدد عظام جسم الإنسان البالغ؟', answers: ['206', 'مئتان وستة'], correct: '206' }
            ],
            sports: [
                { question: 'كم لاعب في فريق كرة القدم؟', answers: ['11', 'أحد عشر', 'احد عشر'], correct: '11' },
                { question: 'في أي دولة نشأت لعبة التنس؟', answers: ['فرنسا', 'france'], correct: 'فرنسا' }
            ],
            geography: [
                { question: 'ما هي أكبر دولة في العالم من حيث المساحة؟', answers: ['روسيا', 'russia'], correct: 'روسيا' },
                { question: 'ما هو أطول نهر في آسيا؟', answers: ['اليانغتسي', 'نهر اليانغتسي'], correct: 'اليانغتسي' }
            ]
        };
        const randomQuestion = questions[category][Math.floor(Math.random() * questions[category].length)];

        gamesSystem.activeGames.set(message.channel.id, {
            type: 'question',
            question: randomQuestion,
            category,
            players: new Set(),
            startTime: Date.now()
        });

        const questionEmbed = {
            color: 0xe74c3c,
            title: '❓ لعبة الأسئلة الثقافية',
            description: `**السؤال:**\n${randomQuestion.question}`,
            fields: [
                { name: '🎯 المطلوب', value: 'اكتب الإجابة في المحادثة!', inline: true },
                { name: '⏱️ الوقت', value: '60 ثانية', inline: true },
                { name: '👥 المشاركة', value: 'للجميع', inline: true }
            ],
            footer: { text: 'اكتب إجابتك في المحادثة!' },
            timestamp: new Date()
        };

        await message.reply({ embeds: [questionEmbed] });

        setTimeout(() => {
            if (gamesSystem.activeGames.has(message.channel.id) && gamesSystem.activeGames.get(message.channel.id).type === 'question') {
                gamesSystem.activeGames.delete(message.channel.id);
                message.channel.send(`⏰ انتهى الوقت! الإجابة الصحيحة كانت: **${randomQuestion.correct}**`);
            }
        }, 60000);
        return;
    }

    if (content === 'كلمه سر' || content === 'لعبه كلمه سر' || content === 'كلمة سر' || content === 'لعبة كلمة سر') {
        if (gamesSystem.activeGames.has(message.channel.id)) {
            await message.reply('❌ هناك لعبة نشطة بالفعل في هذه القناة!');
            return;
        }

        const words = ['كتاب', 'مدرسة', 'مستشفى', 'مطعم', 'حديقة', 'مكتبة', 'متحف', 'سوق', 'مطار', 'محطة'];
        const secretWord = words[Math.floor(Math.random() * words.length)];
        const hiddenWord = secretWord.split('').map(char => char === ' ' ? ' ' : '_').join(' ');

        gamesSystem.activeGames.set(message.channel.id, {
            type: 'word-guess',
            secretWord,
            hiddenWord,
            guessedLetters: new Set(),
            wrongGuesses: 0,
            maxWrongGuesses: 6,
            players: new Set(),
            startTime: Date.now()
        });

        const wordGameEmbed = {
            color: 0x9b59b6,
            title: '🔤 لعبة كلمة السر',
            description: `**الكلمة:**\n\`\`\`${hiddenWord}\`\`\``,
            fields: [
                { name: '❤️ المحاولات المتبقية', value: '6', inline: true },
                { name: '📝 الأحرف المستخدمة', value: 'لا يوجد', inline: true },
                { name: '🎯 المطلوب', value: 'اكتب حرف واحد', inline: true }
            ],
            footer: { text: 'اكتب حرفاً واحداً في المحادثة!' },
            timestamp: new Date()
        };

        await message.reply({ embeds: [wordGameEmbed] });
        return;
    }

    if (content === 'انهاء اللعبه' || content === 'انهاء اللعبة' || content === 'ايقاف اللعبه' || content === 'إنهاء اللعبة' || content === 'إيقاف اللعبة' || content === 'ايقاف') {
        if (!gamesSystem.activeGames.has(message.channel.id)) {
            await message.reply('❌ لا توجد لعبة نشطة في هذه القناة!');
            return;
        }

        gamesSystem.activeGames.delete(message.channel.id);

        const endEmbed = {
            color: 0x95a5a6,
            title: '🛑 تم إنهاء اللعبة',
            description: 'تم إنهاء اللعبة النشطة في هذه القناة.',
            timestamp: new Date()
        };

        await message.reply({ embeds: [endEmbed] });
        return;
    }

    if (content === 'احصايات' || content === 'احصائيات' || content === 'احصايات العاب' || content === 'إحصائيات' || content === 'إحصائيات ألعاب') {
        const stats = gamesSystem.playerStats.get(message.author.id) || {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            favoriteGame: 'لا يوجد'
        };

        const winRate = stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0;

        const statsEmbed = {
            color: 0x3498db,
            title: `📊 إحصائيات الألعاب - ${message.author.username}`,
            thumbnail: { url: message.author.displayAvatarURL({ dynamic: true }) },
            fields: [
                { name: '🎮 الألعاب الممارسة', value: `${stats.gamesPlayed}`, inline: true },
                { name: '🏆 الألعاب المكسوبة', value: `${stats.gamesWon}`, inline: true },
                { name: '📈 معدل الفوز', value: `${winRate}%`, inline: true },
                { name: '⭐ النقاط الإجمالية', value: `${stats.totalScore}`, inline: true },
                { name: '🎯 الرتبة', value: stats.totalScore > 1000 ? 'خبير' : stats.totalScore > 500 ? 'متقدم' : stats.totalScore > 100 ? 'متوسط' : 'مبتدئ', inline: true }
            ],
            footer: { text: 'العب أكثر لتحسين إحصائياتك!' },
            timestamp: new Date()
        };

        await message.reply({ embeds: [statsEmbed] });
        return;
    }

    if (content === 'نرد' || content === 'لعبه نرد' || content === 'لعبة نرد') {
        if (gamesSystem.activeGames.has(message.channel.id)) {
            await message.reply('❌ هناك لعبة نشطة بالفعل في هذه القناة! اكتب `إنهاء اللعبة` لإنهائها أولاً.');
            return;
        }

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

        const diceJoinButton = new ButtonBuilder()
            .setCustomId('dice_join')
            .setLabel('دخول اللعبة')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎲');

        const diceLeaveButton = new ButtonBuilder()
            .setCustomId('dice_leave')
            .setLabel('خروج من اللعبة')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const diceActionRow = new ActionRowBuilder()
            .addComponents(diceJoinButton, diceLeaveButton);

        gamesSystem.activeGames.set(message.channel.id, {
            type: 'dice',
            players: new Set(),
            phase: 'waiting',
            teams: { team1: [], team2: [] },
            scores: { team1: 0, team2: 0 },
            round: 1,
            maxRounds: 3,
            currentPlayer: null,
            gameMessage: null,
            startTime: Date.now()
        });

        const diceEmbed = {
            color: 0x00ff00,
            title: '🎲 لعبة النرد الجماعية',
            description: `@here\n\n🎮 **تم بدء لعبة نرد جماعية!**\n\n📋 **القواعد:**\n• الحد الأدنى: 4 لاعبين\n• يتم تقسيم اللاعبين لفريقين\n• 3 جولات للمنافسة\n• كل لاعب يحصل على نرد عشوائي\n\n⏰ **وقت الانضمام: 30 ثانية**`,
            fields: [
                { name: '👥 اللاعبون', value: 'لا يوجد لاعبون بعد', inline: true },
                { name: '⏱️ الوقت المتبقي', value: '30 ثانية', inline: true },
                { name: '🎯 الحالة', value: 'انتظار اللاعبين', inline: true }
            ],
            footer: { text: 'اضغط على "دخول اللعبة" للمشاركة!' },
            timestamp: new Date()
        };

        const diceGameMessage = await message.reply({
            embeds: [diceEmbed],
            components: [diceActionRow]
        });

        const diceGame = gamesSystem.activeGames.get(message.channel.id);
        diceGame.gameMessage = diceGameMessage;

        // مؤقت 30 ثانية للانضمام
        setTimeout(async () => {
            if (!gamesSystem.activeGames.has(message.channel.id) || gamesSystem.activeGames.get(message.channel.id).type !== 'dice') return;

            const currentDiceGame = gamesSystem.activeGames.get(message.channel.id);
            if (currentDiceGame.players.size < 4) {
                gamesSystem.activeGames.delete(message.channel.id);

                const cancelEmbed = {
                    color: 0xff0000,
                    title: '❌ تم إلغاء اللعبة',
                    description: `لم ينضم عدد كافي من اللاعبين (${currentDiceGame.players.size}/4)\nالحد الأدنى: 4 لاعبين`,
                    timestamp: new Date()
                };

                await diceGameMessage.edit({ embeds: [cancelEmbed], components: [] });
            } else {
                // تقسيم اللاعبين لفريقين وبدء اللعبة
                await gamesSystem.startDiceGame(message.channel.id, { channel: message.channel, guild: message.guild });
            }
        }, 30000);
        return;
    }

    // معالجة رسائل الألعاب
    if (await gamesSystem.handleGameMessage(message)) {
        return;
    }

    // معالجة رسائل التكتات
    if (await ticketSystem.handleTicketMessage(message)) {
        return;
    }

    // أمر التحويل الكتابي
    if (content.startsWith('تحويل') || content.startsWith('حول')) {
        const args = message.content.split(' ');
        if (args.length < 3) {
            await message.reply('❌ الاستخدام الصحيح: `تحويل @الشخص المبلغ`');
            return;
        }

        const mentionedUser = message.mentions.users.first();
        const transferAmount = parseInt(args[2]);

        if (!mentionedUser) {
            await message.reply('❌ يجب ذكر الشخص المراد التحويل له!');
            return;
        }

        if (isNaN(transferAmount) || transferAmount <= 0) {
            await message.reply('❌ يجب إدخال مبلغ صحيح أكبر من صفر!');
            return;
        }

        if (mentionedUser.id === message.author.id) {
            await message.reply('❌ لا يمكنك تحويل النقدة لنفسك!');
            return;
        }

        const senderPoints = pointsSystem.getUserPoints(message.author.id);

        // حساب الضريبة الثابتة 6%
        const feePercentage = 6;
        const fee = Math.floor((transferAmount * feePercentage) / 100);
        const totalRequired = transferAmount + fee;

        if (senderPoints < totalRequired) {
            await message.reply(`❌ ليس لديك نقدة كافية! تحتاج ${totalRequired.toLocaleString()} نقدة (${transferAmount.toLocaleString()} + ${fee.toLocaleString()} رسوم) ولديك ${senderPoints.toLocaleString()} نقدة فقط.`);
            return;
        }

        pointsSystem.addUserPoints(message.author.id, -totalRequired);
        pointsSystem.addUserPoints(mentionedUser.id, transferAmount);

        const transferEmbed = {
            color: 0x00ff00,
            title: '✅ تم التحويل بنجاح',
            description: `تم تحويل **${transferAmount.toLocaleString()}** نقدة إلى ${mentionedUser}`,
            fields: [
                { name: '👤 المرسل', value: `${message.author.tag}`, inline: true },
                { name: '👤 المستقبل', value: `${mentionedUser.tag}`, inline: true },
                { name: '💰 المبلغ المحول', value: `${transferAmount.toLocaleString()} نقدة`, inline: true },
                { name: '💸 رسوم التحويل', value: `${fee.toLocaleString()} نقدة (${feePercentage}%)`, inline: true },
                { name: '💳 إجمالي المخصوم', value: `${totalRequired.toLocaleString()} نقدة`, inline: true },
                { name: '💰 رصيدك الجديد', value: `${pointsSystem.getUserPoints(message.author.id).toLocaleString()} نقدة`, inline: true }
            ],
            timestamp: new Date};
        await message.reply({ embeds: [transferEmbed] });
        return;
    }
});

client.on('interactionCreate', async interaction => {
    // معالجة الأزرار
    if (interaction.isButton()) {
        try {
            // معالجة أزرار الروليت
            if (interaction.customId && interaction.customId.startsWith('roulette_')) {
                await gamesSystem.handleRouletteButton(interaction);
                return;
            }

            // معالجة أزرار عجلة الحظ
            if (interaction.customId && interaction.customId.startsWith('wheel_')) {
                await gamesSystem.handleWheelButton(interaction);
                return;
            }

            // معالجة أزرار النرد
            if (interaction.customId && interaction.customId.startsWith('dice_')) {
                await gamesSystem.handleDiceButton(interaction);
                return;
            }

            // محاولة معالجة أزرار التوثيق أولاً
            if (await verificationSystem.handleVerificationButton(interaction)) {
                return;
            }

            // إذا لم تكن أزرار توثيق، معالجة أزرار التكتات
            await ticketSystem.handleButtonInteraction(interaction);
        } catch (error) {
            console.error('خطأ في معالجة الزر:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ حدث خطأ أثناء معالجة طلبك.', 
                        ephemeral: true 
                    });
                }
            } catch (replyError) {
                console.error('خطأ في الرد على التفاعل:', replyError);
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // إشعار المالك بالاستخدام
    const notificationMessage = `🔔 **تم استخدام أمر!**\n\n` +
        `👤 **المستخدم:** ${interaction.user.tag} (<@${interaction.user.id}>)\n` +
        `🏠 **السيرفر:** ${interaction.guild.name}\n` +
        `⚡ **الأمر:** /${commandName}\n` +
        `📅 **الوقت:** ${new Date().toLocaleString('ar-SA')}`;

    await notifyOwner(notificationMessage);

    try {
        // محاولة معالجة الأمر في نظام النقاط أولاً
        if (await pointsSystem.handlePointsCommand(interaction)) {
            return; // تم التعامل مع الأمر في نظام النقاط
        }

        // محاولة معالجة الأمر في نظام الألعاب
        if (await gamesSystem.handleGamesCommand(interaction)) {
            return; // تم التعامل مع الأمر في نظام الألعاب
        }

        // محاولة معالجة الأمر في نظام التكتات
        if (await ticketSystem.handleTicketCommand(interaction)) {
            return; // تم التعامل مع الأمر في نظام التكتات
        }

        // محاولة معالجة الأمر في نظام التوثيق
        if (await verificationSystem.handleVerificationCommand(interaction)) {
            return; // تم التعامل مع الأمر في نظام التوثيق
        }

        // محاولة معالجة الأمر في نظام اللغة
        if (await languageSystem.handleLanguageCommand(interaction)) {
            return; // تم التعامل مع الأمر في نظام اللغة
        }

        switch (commandName) {
            case 'انشاء':
                const roomName = interaction.options.getString('اسم_الروم');
                const roomType = interaction.options.getString('نوع_الروم');
                const category = interaction.options.getChannel('الكاتاجوري');
                const isLocked = interaction.options.getBoolean('مقفل') || false;

                const channelType = roomType === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

                const channelOptions = {
                    name: roomName,
                    type: channelType,
                    parent: category?.id || null,
                };

                if (isLocked) {
                    channelOptions.permissionOverwrites = [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: roomType === 'voice' ? 
                                [PermissionFlagsBits.Connect] : 
                                [PermissionFlagsBits.SendMessages],
                        },
                    ];
                }

                const channel = await interaction.guild.channels.create(channelOptions);

                await interaction.reply(`تم إنشاء ${roomType === 'voice' ? 'روم الصوت' : 'روم الشات'} ${channel} بنجاح! ${isLocked ? '(مقفل)' : '(مفتوح)'}`);
                break;

            case 'رتبة':
                const roleName = interaction.options.getString('اسم_الرتبة');
                const roleColor = interaction.options.getString('لون_الرتبة');

                const roleOptions = { name: roleName };
                if (roleColor) {
                    roleOptions.color = roleColor;
                }

                const role = await interaction.guild.roles.create(roleOptions);

                await interaction.reply(languageSystem.translate(interaction.guildId, 'roleCreated') + ` ${role} ` + languageSystem.translate(interaction.guildId, 'successfully'));
                break;

            case 'حذف-رتبة':
                const roleToDelete = interaction.options.getRole('الرتبة');
                const roleNameToDelete = roleToDelete.name;

                await roleToDelete.delete();
                await interaction.reply(languageSystem.translate(interaction.guildId, 'roleDeleted') + ` "${roleNameToDelete}" ` + languageSystem.translate(interaction.guildId, 'successfully'));
                break;

            case 'اعطاء-رتبة':
                const userToGiveRole = interaction.options.getUser('الشخص');
                const roleToGive = interaction.options.getRole('الرتبة');
                const memberToGiveRole = await interaction.guild.members.fetch(userToGiveRole.id);

                if (memberToGiveRole.roles.cache.has(roleToGive.id)) {
                    const errorEmbed = {
                        color: 0xff0000,
                        title: languageSystem.translate(interaction.guildId, 'error'),
                        description: languageSystem.translate(interaction.guildId, 'roleAlreadyExists'),
                        timestamp: new Date()
                    };
                    await interaction.reply({ embeds: [errorEmbed] });
                    return;
                }

                await memberToGiveRole.roles.add(roleToGive);

                const giveRoleEmbed = {
                    color: 0x00ff00,
                    title: languageSystem.translate(interaction.guildId, 'roleGivenSuccess'),
                    description: languageSystem.translate(interaction.guildId, 'roleGivenTo', { role: roleToGive, user: userToGiveRole }),
                    fields: [
                        { name: languageSystem.translate(interaction.guildId, 'member'), value: `${userToGiveRole.tag}`, inline: true },
                        { name: languageSystem.translate(interaction.guildId, 'role'), value: `${roleToGive.name}`, inline: true },
                        { name: languageSystem.translate(interaction.guildId, 'by'), value: `${interaction.user.tag}`, inline: true }
                    ],
                    thumbnail: { url: userToGiveRole.displayAvatarURL({ dynamic: true }) },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [giveRoleEmbed] });
                break;

            case 'ازالة-رتبة':
                const userToRemoveRole = interaction.options.getUser('الشخص');
                const roleToRemove = interaction.options.getRole('الرتبة');
                const memberToRemoveRole = await interaction.guild.members.fetch(userToRemoveRole.id);

                if (!memberToRemoveRole.roles.cache.has(roleToRemove.id)) {
                    const removeRoleErrorEmbed = {
                        color: 0xff0000,
                        title: languageSystem.translate(interaction.guildId, 'error'),
                        description: languageSystem.translate(interaction.guildId, 'roleNotFound'),
                        timestamp: new Date()
                    };
                    await interaction.reply({ embeds: [removeRoleErrorEmbed] });
                    return;
                }

                await memberToRemoveRole.roles.remove(roleToRemove);

                const removeRoleEmbed = {
                    color: 0xff9900,
                    title: languageSystem.translate(interaction.guildId, 'roleRemovedSuccess'),
                    description: languageSystem.translate(interaction.guildId, 'roleRemovedFrom', { role: roleToRemove, user: userToRemoveRole }),
                    fields: [
                        { name: languageSystem.translate(interaction.guildId, 'member'), value: `${userToRemoveRole.tag}`, inline: true },
                        { name: languageSystem.translate(interaction.guildId, 'role'), value: `${roleToRemove.name}`, inline: true },
                        { name: languageSystem.translate(interaction.guildId, 'by'), value: `${interaction.user.tag}`, inline: true }
                    ],
                    thumbnail: { url: userToRemoveRole.displayAvatarURL({ dynamic: true }) },
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [removeRoleEmbed] });
                break;

            case 'مسح':
                const amount = interaction.options.getInteger('العدد');
                const targetUser = interaction.options.getUser('الشخص');

                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                let messagesToDelete;

                if (targetUser) {
                    messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id).first(amount);
                } else {
                    messagesToDelete = Array.from(messages.values()).slice(0, amount);
                }

                await interaction.channel.bulkDelete(messagesToDelete);
                await interaction.reply(languageSystem.translate(interaction.guildId, 'messagesDeleted', { count: messagesToDelete.length }));
                break;

            case 'اسم-مستعار':
                const userToNickname = interaction.options.getUser('الشخص');
                const newNickname = interaction.options.getString('الاسم_الجديد');
                const memberToNickname = await interaction.guild.members.fetch(userToNickname.id);
                const botMember = await interaction.guild.members.fetch(client.user.id);

                // فحص إذا كان البوت يستطيع تعديل هذا العضو
                if (memberToNickname.roles.highest.position >= botMember.roles.highest.position && userToNickname.id !== interaction.guild.ownerId) {
                    await interaction.reply({ content: '❌ لا يمكنك تغيير اسم هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها!', flags: MessageFlags.Ephemeral });
                    return;
                }

                // فحص إذا كان العضو هو صاحب السيرفر
                if (userToNickname.id === interaction.guild.ownerId) {
                    await interaction.reply({ content: '❌ لا يمكنني تغيير اسم صاحب السيرفر!', flags: MessageFlags.Ephemeral });
                    return;
                }

                try {
                    await memberToNickname.setNickname(newNickname);
                    await interaction.reply(`✅ تم تغيير اسم ${userToNickname} إلى "${newNickname}" بنجاح!`);
                } catch (error) {
                    if (error.code === 50013) {
                        if (!interaction.replied) {
                            await interaction.reply({ content: '❌ ليس لدي صلاحية كافية لتغيير اسم هذا العضو!', flags: MessageFlags.Ephemeral });
                        }
                    } else {
                        if (!interaction.replied) {
                            await interaction.reply({ content: '❌ حدث خطأ أثناء تغيير الاسم. يرجى المحاولة مرة أخرى.', flags: MessageFlags.Ephemeral });
                        }
                    }
                }
                break;

            case 'ارسل':
                // تأجيل الرد لتجنب مشكلة Unknown interaction
                await interaction.deferReply({ ephemeral: true });

                const recipientUser = interaction.options.getUser('الشخص');
                const privateMessage = interaction.options.getString('الرسالة');
                const shouldMentionSingle = interaction.options.getBoolean('منشن') || false;
                const shouldSpam = interaction.options.getBoolean('سبام') || false;
                const spamMessageCount = interaction.options.getInteger('عدد_الرسائل') || 5;
                const spamMessageSpeed = interaction.options.getInteger('سرعة_السبام') || 1000;

                // تحضير الرسالة النهائية
                const finalPrivateMessage = shouldMentionSingle ? `${recipientUser} ${privateMessage}` : privateMessage;

                try {
                    if (shouldSpam) {
                        // وضع السبام
                        await interaction.editReply({ content: `جاري إرسال ${spamMessageCount} رسالة إلى ${recipientUser.tag} بسرعة ${spamMessageSpeed}ms...` });

                        let sentSpamCount = 0;
                        let failedSpamCount = 0;

                        for (let i = 0; i < spamMessageCount; i++) {
                            try {
                                await recipientUser.send(finalPrivateMessage);
                                sentSpamCount++;
                                
                                // انتظار بين الرسائل
                                if (i < spamMessageCount - 1) {
                                    await new Promise(resolve => setTimeout(resolve, spamMessageSpeed));
                                }
                            } catch (error) {
                                console.log(`فشل في إرسال الرسالة رقم ${i + 1} إلى ${recipientUser.tag}`);
                                failedSpamCount++;
                            }
                        }

                        let spamResultMessage = `✅ تم إرسال السبام بنجاح!\n`;
                        spamResultMessage += `📊 **إحصائيات السبام:**\n`;
                        spamResultMessage += `• المستقبل: ${recipientUser.tag}\n`;
                        spamResultMessage += `• تم الإرسال: ${sentSpamCount} رسالة\n`;
                        spamResultMessage += `• فشل: ${failedSpamCount} رسالة\n`;
                        spamResultMessage += `• السرعة: ${spamMessageSpeed}ms\n`;
                        spamResultMessage += `• المنشن: ${shouldMentionSingle ? 'مفعل' : 'معطل'}`;

                        await interaction.editReply({ content: spamResultMessage });
                    } else {
                        // إرسال عادي
                        await recipientUser.send(finalPrivateMessage);
                        await interaction.editReply({ 
                            content: `✅ تم إرسال الرسالة بنجاح إلى ${recipientUser.tag}!\n` +
                                    `📋 المنشن: ${shouldMentionSingle ? 'مفعل' : 'معطل'}`
                        });
                    }
                } catch (error) {
                    await interaction.editReply({ 
                        content: `❌ فشل في إرسال الرسالة إلى ${recipientUser.tag}.\nقد يكون المستخدم قد أغلق الرسائل الخاصة.`
                    });
                }
                break;

            case 'ارسال':
                // تأجيل الرد لتجنب مشكلة Unknown interaction
                await interaction.deferReply({ ephemeral: true });

                const numberOfUsers = interaction.options.getInteger('عدد_الاشخاص');
                const shouldMention = interaction.options.getBoolean('منشن');
                const messageToSend = interaction.options.getString('الرسالة');

                const members = await interaction.guild.members.fetch();
                // تصفية البوتات والحصول على الأعضاء الحقيقيين فقط
                const realMembers = members.filter(member => !member.user.bot);
                const totalMembers = realMembers.size;

                // تحديد العدد الفعلي للإرسال (العدد المطلوب أو عدد الأعضاء المتوفر أيهما أقل)
                const actualSendCount = Math.min(numberOfUsers, totalMembers);

                // اختيار أعضاء عشوائيين
                const membersArray = Array.from(realMembers.values());
                const shuffledMembers = membersArray.sort(() => 0.5 - Math.random());
                const selectedMembers = shuffledMembers.slice(0, actualSendCount);

                let sentCount = 0;
                let failedCount = 0;

                await interaction.editReply({ content: `جاري إرسال الرسالة إلى ${actualSendCount} شخص...` });

                for (const member of selectedMembers) {
                    try {
                        const finalMessage = shouldMention ? `${member} ${messageToSend}` : messageToSend;
                        await member.send(finalMessage);
                        sentCount++;
                    } catch (error) {
                        console.log(`فشل في إرسال الرسالة إلى ${member.user.tag}`);
                        failedCount++;
                    }
                }

                let resultMessage = `✅ تم إرسال الرسالة بنجاح!\n`;
                resultMessage += `📊 **إحصائيات الإرسال:**\n`;
                resultMessage += `• العدد المطلوب: ${numberOfUsers}\n`;
                resultMessage += `• العدد المتوفر: ${totalMembers}\n`;
                resultMessage += `• تم الإرسال لـ: ${sentCount} شخص\n`;
                if (failedCount > 0) {
                    resultMessage += `• فشل الإرسال لـ: ${failedCount} شخص`;
                }

                await interaction.editReply({ content: resultMessage });
                break;

            case 'زخرفة':
                const textToDecorate = interaction.options.getString('النص');
                const decoratedTexts = decorateText(textToDecorate);

                let decorationMessage = `**زخرفة النص: ${textToDecorate}**\n\n`;
                decoratedTexts.forEach((decoration, index) => {
                    decorationMessage += `${index + 1}. ${decoration}\n`;
                });

                await interaction.reply(decorationMessage);
                break;

            case 'حذف_روم':
                const channelToDelete = interaction.options.getChannel('الروم');
                const channelName = channelToDelete.name;

                await channelToDelete.delete();
                await interaction.reply(`تم حذف الروم "${channelName}" بنجاح!`);
                break;

            case 'معلومات_العضو':
                const targetMember = interaction.options.getUser('الشخص');
                const memberInfo = await interaction.guild.members.fetch(targetMember.id);

                const joinedAt = memberInfo.joinedAt?.toLocaleDateString('ar-SA') || 'غير محدد';
                const createdAt = targetMember.createdAt.toLocaleDateString('ar-SA');
                const roles = memberInfo.roles.cache.filter(role => role.id !== interaction.guild.id).map(role => role.toString()).join(', ') || 'لا يوجد';

                const memberEmbed = {
                    color: 0x0099ff,
                    title: `معلومات العضو: ${targetMember.username}`,
                    thumbnail: { url: targetMember.displayAvatarURL({ dynamic: true }) },
                    fields: [
                        { name: 'الاسم', value: targetMember.username, inline: true },
                        { name: 'التاج', value: targetMember.discriminator, inline: true },
                        { name: 'الآيدي', value: targetMember.id, inline: true },
                        { name: 'انضم للديسكورد', value: createdAt, inline: true },
                        { name: 'انضم للسيرفر', value: joinedAt, inline: true },
                        { name: 'الرتب', value: roles, inline: false }
                    ],
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [memberEmbed] });
                break;

            case 'منع':
                const userToBan = interaction.options.getUser('الشخص');
                const banReason = interaction.options.getString('السبب') || 'لم يتم تحديد سبب';

                try {
                    await interaction.guild.members.ban(userToBan, { reason: banReason });
                    await interaction.reply(`تم منع ${userToBan} من السيرفر.\nالسبب: ${banReason}`);
                } catch (error) {
                    await interaction.reply('فشل في منع العضو. تأكد من أن البوت يملك صلاحيات كافية.');
                }
                break;

            case 'باند':
                const userToKick = interaction.options.getUser('الشخص');
                const kickReason = interaction.options.getString('السبب') || 'لم يتم تحديد سبب';
                const memberToKick = await interaction.guild.members.fetch(userToKick.id);

                try {
                    await memberToKick.kick(kickReason);
                    await interaction.reply(`تم طرد ${userToKick} من السيرفر.\nالسبب: ${kickReason}`);
                } catch (error) {
                    await interaction.reply('فشل في طرد العضو. تأكد من أن البوت يملك صلاحيات كافية.');
                }
                break;

            case 'سبام-فويس':
                const voiceChannel = interaction.options.getChannel('روم_الصوت');
                const spamCount = interaction.options.getInteger('عدد_المرات') || 20;
                const spamSpeed = interaction.options.getInteger('سرعة_السبام') || 500;

                // التحقق من أن القناة هي روم صوت
                if (voiceChannel.type !== ChannelType.GuildVoice) {
                    await interaction.reply({ 
                        content: '❌ يجب اختيار روم صوت!',
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                // التحقق من صلاحيات البوت
                const voiceBotMember = interaction.guild.members.me;
                if (!voiceChannel.permissionsFor(voiceBotMember).has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
                    await interaction.reply({ 
                        content: '❌ البوت لا يملك صلاحية الدخول إلى هذا الروم الصوتي!',
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                await interaction.reply(`🎤 بدء سبام الفويس في ${voiceChannel}!\n📊 عدد المرات: ${spamCount}\n⚡ السرعة: ${spamSpeed}ms`);

                // تشغيل سبام الفويس
                let currentSpam = 0;
                let connection = null;
                
                const spamInterval = setInterval(async () => {
                    try {
                        if (currentSpam >= spamCount) {
                            clearInterval(spamInterval);
                            if (connection && connection.state.status !== 'destroyed') {
                                connection.destroy();
                            }
                            await interaction.followUp('✅ تم انتهاء سبام الفويس!');
                            return;
                        }

                        // الدخول
                        const { joinVoiceChannel } = require('@discordjs/voice');
                        connection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: interaction.guild.id,
                            adapterCreator: interaction.guild.voiceAdapterCreator,
                        });

                        // انتظار قصير ثم الخروج
                        setTimeout(() => {
                            if (connection && connection.state.status !== 'destroyed') {
                                connection.destroy();
                                connection = null;
                            }
                        }, Math.floor(spamSpeed / 2));

                        currentSpam++;
                    } catch (error) {
                        console.error('خطأ في سبام الفويس:', error);
                        clearInterval(spamInterval);
                        if (connection && connection.state.status !== 'destroyed') {
                            connection.destroy();
                        }
                        await interaction.followUp('❌ حدث خطأ أثناء سبام الفويس!');
                    }
                }, spamSpeed);

                // إيقاف السبام بعد دقيقتين للأمان
                setTimeout(() => {
                    clearInterval(spamInterval);
                    if (connection && connection.state.status !== 'destroyed') {
                        connection.destroy();
                    }
                }, 120000);
                break;



            default:
                await interaction.reply({ content: 'امر غير معروف!', flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        console.error('خطأ في تنفيذ الامر:', error);

        // إشعار المالك بالخطأ
        const errorNotification = `❌ **حدث خطأ في البوت!**\n\n` +
            `👤 **المستخدم:** ${interaction.user.tag}\n` +
            `🏠 **السيرفر:** ${interaction.guild.name}\n` +
            `⚡ **الأمر:** /${commandName}\n` +
            `🐛 **الخطأ:** ${error.message}\n` +
            `📅 **الوقت:** ${new Date().toLocaleString('ar-SA')}`;

        await notifyOwner(errorNotification);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: 'حدث خطأ اثناء تنفيذ الامر. يرجى المحاولة مرة اخرى.' });
            } else {
                await interaction.reply({ content: 'حدث خطأ اثناء تنفيذ الامر. يرجى المحاولة مرة اخرى.', flags: MessageFlags.Ephemeral });
            }
        } catch (replyError) {
            console.error('خطأ في الرد على التفاعل:', replyError);
        }
    }
});


app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Web server is running on port 3000');
});

client.login(TOKEN);