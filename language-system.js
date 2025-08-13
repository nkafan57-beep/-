
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

console.log('✅ تم تحميل نظام تبديل اللغة بنجاح!');

// قاعدة بيانات اللغات للسيرفرات
const serverLanguages = new Map(); // guildId -> language ('ar' | 'en')

// النصوص المترجمة
const translations = {
    ar: {
        // أوامر عامة
        roomCreated: 'تم إنشاء',
        voiceRoom: 'روم الصوت',
        textRoom: 'روم الشات',
        successfully: 'بنجاح!',
        locked: '(مقفل)',
        open: '(مفتوح)',
        roleCreated: 'تم إنشاء الرتبة',
        roleDeleted: 'تم حذف الرتبة',
        roleGiven: 'تم إعطاء الرتبة',
        roleRemoved: 'تم إزالة الرتبة',
        messagesDeleted: 'تم حذف {count} رسالة بنجاح!',
        nicknameChanged: 'تم تغيير اسم {user} إلى "{nickname}" بنجاح!',
        messageSent: 'تم إرسال الرسالة بنجاح!',
        messageFailed: 'فشل في إرسال الرسالة. قد يكون المستخدم قد أغلق الرسائل الخاصة.',
        channelDeleted: 'تم حذف الروم "{name}" بنجاح!',
        userBanned: 'تم منع {user} من السيرفر.\nالسبب: {reason}',
        userKicked: 'تم طرد {user} من السيرفر.\nالسبب: {reason}',
        
        // رسائل الأخطاء
        noPermission: '❌ ليس لديك صلاحية لاستخدام هذا الأمر!',
        roleAlreadyExists: '❌ هذا العضو يملك هذه الرتبة بالفعل!',
        roleNotFound: '❌ هذا العضو لا يملك هذه الرتبة!',
        cannotModifyOwner: '❌ لا يمكنني تغيير اسم صاحب السيرفر!',
        cannotModifyHigherRole: '❌ لا يمكنك تغيير اسم هذا العضو لأن رتبته أعلى من رتبة البوت أو مساوية لها!',
        insufficientPermissions: '❌ ليس لدي صلاحية كافية لتغيير اسم هذا العضو!',
        dmsClosed: 'فشل في إرسال الرسالة. قد يكون المستخدم قد أغلق الرسائل الخاصة.',
        
        // رسائل النجاح
        roleGivenSuccess: '✅ تم إعطاء الرتبة بنجاح',
        roleRemovedSuccess: '🗑️ تم إزالة الرتبة بنجاح',
        roleGivenTo: 'تم إعطاء الرتبة {role} للعضو {user}',
        roleRemovedFrom: 'تم إزالة الرتبة {role} من العضو {user}',
        
        // عناوين الحقول
        member: '👤 العضو',
        role: '🏷️ الرتبة',
        by: '👑 بواسطة',
        reason: 'السبب',
        
        // رسائل إرسال الرسائل الجماعي
        sendingMessages: 'جاري إرسال الرسالة إلى {count} شخص...',
        sendingStats: '✅ تم إرسال الرسالة بنجاح!\n📊 **إحصائيات الإرسال:**',
        requested: '• العدد المطلوب: {count}',
        available: '• العدد المتوفر: {count}',
        sentTo: '• تم الإرسال لـ: {count} شخص',
        failedTo: '• فشل الإرسال لـ: {count} شخص',
        
        // معلومات الأعضاء
        memberInfo: 'معلومات العضو: {username}',
        name: 'الاسم',
        tag: 'التاج',
        id: 'الآيدي',
        joinedDiscord: 'انضم للديسكورد',
        joinedServer: 'انضم للسيرفر',
        roles: 'الرتب',
        noRoles: 'لا يوجد',
        notSpecified: 'غير محدد',
        
        // زخرفة النصوص
        textDecoration: '**زخرفة النص: {text}**',
        
        // رسائل البان والكيك
        banSuccess: 'تم منع {user} من السيرفر.\nالسبب: {reason}',
        kickSuccess: 'تم طرد {user} من السيرفر.\nالسبب: {reason}',
        banFailed: 'فشل في منع العضو. تأكد من أن البوت يملك صلاحيات كافية.',
        kickFailed: 'فشل في طرد العضو. تأكد من أن البوت يملك صلاحيات كافية.',
        noReasonProvided: 'لم يتم تحديد سبب',
        
        // شرح الأوامر
        commandExplanations: {
            'لعبة-روليت': 'Roulette - لعبة حظ جماعية حيث يطرد اللاعبون بعضهم البعض حتى يبقى فائز واحد',
            'نرد': 'Dice - لعبة نرد جماعية بفرق متنافسة',
            'نقدة': 'Points - عرض نقدتك الحالية في النظام',
            'تحويل': 'Transfer - تحويل نقدة لشخص آخر مع رسوم',
            'اعطاء': 'Give - إعطاء نقدة (خاص بصاحب البوت)',
            'نقطة': 'User Points - عرض نقدة شخص آخر',
            'يومية': 'Daily - استلام الجائزة اليومية',
            'اسبوعية': 'Weekly - استلام الجائزة الأسبوعية', 
            'شهرية': 'Monthly - استلام الجائزة الشهرية',
            'حساب-ضريبة': 'Tax Calculator - حساب الضريبة المطلوبة للتحويل',
            'انشاء': 'Create - إنشاء روم جديد (نص أو صوت)',
            'رتبة': 'Role - إنشاء رتبة جديدة',
            'حذف-رتبة': 'Delete Role - حذف رتبة موجودة',
            'اعطاء-رتبة': 'Give Role - إعطاء رتبة لعضو',
            'ازالة-رتبة': 'Remove Role - إزالة رتبة من عضو',
            'مسح': 'Clear - حذف عدد من الرسائل',
            'اسم-مستعار': 'Nickname - تغيير اسم مستعار لعضو',
            'ارسل': 'Send DM - إرسال رسالة خاصة لشخص',
            'ارسال': 'Mass DM - إرسال رسالة لعدة أشخاص',
            'زخرفة': 'Decoration - زخرفة النصوص بأشكال مختلفة',
            'حذف_روم': 'Delete Room - حذف روم من السيرفر',
            'معلومات_العضو': 'Member Info - عرض معلومات عضو',
            'منع': 'Ban - منع عضو من السيرفر',
            'باند': 'Kick - طرد عضو من السيرفر',
            'language': 'Language - تغيير لغة البوت',
            'current-language': 'Current Language - عرض اللغة الحالية'
        },
        
        // نظام النقاط
        currentPoints: '💰 نقدتك الحالية',
        hasPoints: 'لديك **{points}** نقدة',
        userPoints: '💰 نقدة {username}',
        dailyReward: '🎁 جائزة يومية!',
        weeklyReward: '🎁 جائزة أسبوعية!',
        monthlyReward: '🎁 جائزة شهرية!',
        alreadyClaimedDaily: '❌ لقد استلمت الجائزة اليومية بالفعل! عد غداً.',
        alreadyClaimedWeekly: '❌ لقد استلمت الجائزة الأسبوعية بالفعل! عد الأسبوع القادم.',
        alreadyClaimedMonthly: '❌ لقد استلمت الجائزة الشهرية بالفعل! عد الشهر القادم.',
        transferSuccess: '✅ تم التحويل بنجاح',
        transferFailed: '❌ ليس لديك نقدة كافية!',
        
        // نظام الألعاب
        gameActive: '❌ هناك لعبة نشطة بالفعل في هذه القناة!',
        noActiveGame: '❌ لا توجد لعبة نشطة في هذه القناة!',
        gameEnded: '🛑 تم إنهاء اللعبة',
        joinGame: 'دخول اللعبة',
        leaveGame: 'خروج من اللعبة',
        
        // الأخطاء
        error: '❌ خطأ',
        unknownCommand: 'امر غير معروف!',
        commandError: 'حدث خطأ اثناء تنفيذ الامر. يرجى المحاولة مرة اخرى.',
        
        // نظام اللغة
        languageChanged: '✅ تم تغيير اللغة إلى العربية',
        currentLanguage: 'اللغة الحالية',
        arabic: 'العربية',
        english: 'الإنجليزية'
    },
    en: {
        // General commands
        roomCreated: 'Created',
        voiceRoom: 'voice room',
        textRoom: 'text room',
        successfully: 'successfully!',
        locked: '(locked)',
        open: '(open)',
        roleCreated: 'Role created',
        roleDeleted: 'Role deleted',
        roleGiven: 'Role given',
        roleRemoved: 'Role removed',
        messagesDeleted: 'Successfully deleted {count} messages!',
        nicknameChanged: 'Successfully changed {user}\'s nickname to "{nickname}"!',
        messageSent: 'Message sent successfully!',
        messageFailed: 'Failed to send message. The user may have disabled DMs.',
        channelDeleted: 'Successfully deleted channel "{name}"!',
        userBanned: 'Banned {user} from the server.\nReason: {reason}',
        userKicked: 'Kicked {user} from the server.\nReason: {reason}',
        
        // Error messages
        noPermission: '❌ You don\'t have permission to use this command!',
        roleAlreadyExists: '❌ This member already has this role!',
        roleNotFound: '❌ This member doesn\'t have this role!',
        cannotModifyOwner: '❌ I cannot change the server owner\'s nickname!',
        cannotModifyHigherRole: '❌ You cannot change this member\'s nickname because their role is higher than or equal to the bot\'s role!',
        insufficientPermissions: '❌ I don\'t have sufficient permissions to change this member\'s nickname!',
        dmsClosed: 'Failed to send message. The user may have disabled DMs.',
        
        // Success messages
        roleGivenSuccess: '✅ Role Given Successfully',
        roleRemovedSuccess: '🗑️ Role Removed Successfully',
        roleGivenTo: 'Given role {role} to member {user}',
        roleRemovedFrom: 'Removed role {role} from member {user}',
        
        // Field titles
        member: '👤 Member',
        role: '🏷️ Role',
        by: '👑 By',
        reason: 'Reason',
        
        // Mass messaging
        sendingMessages: 'Sending message to {count} people...',
        sendingStats: '✅ Message sent successfully!\n📊 **Sending Statistics:**',
        requested: '• Requested count: {count}',
        available: '• Available count: {count}',
        sentTo: '• Sent to: {count} people',
        failedTo: '• Failed to send to: {count} people',
        
        // Member information
        memberInfo: 'Member Information: {username}',
        name: 'Name',
        tag: 'Tag',
        id: 'ID',
        joinedDiscord: 'Joined Discord',
        joinedServer: 'Joined Server',
        roles: 'Roles',
        noRoles: 'None',
        notSpecified: 'Not specified',
        
        // Text decoration
        textDecoration: '**Text Decoration: {text}**',
        
        // Ban and kick messages
        banSuccess: 'Banned {user} from the server.\nReason: {reason}',
        kickSuccess: 'Kicked {user} from the server.\nReason: {reason}',
        banFailed: 'Failed to ban member. Make sure the bot has sufficient permissions.',
        kickFailed: 'Failed to kick member. Make sure the bot has sufficient permissions.',
        noReasonProvided: 'No reason provided',
        
        // Command explanations
        commandExplanations: {
            'لعبة-روليت': 'Roulette - Group luck game where players eliminate each other until one winner remains',
            'نرد': 'Dice - Group dice game with competing teams',
            'نقدة': 'Points - Display your current points in the system',
            'تحويل': 'Transfer - Transfer points to another person with fees',
            'اعطاء': 'Give - Give points (bot owner only)',
            'نقطة': 'User Points - Display someone else\'s points',
            'يومية': 'Daily - Claim daily reward',
            'اسبوعية': 'Weekly - Claim weekly reward',
            'شهرية': 'Monthly - Claim monthly reward',
            'حساب-ضريبة': 'Tax Calculator - Calculate transfer tax required',
            'انشاء': 'Create - Create new room (text or voice)',
            'رتبة': 'Role - Create new role',
            'حذف-رتبة': 'Delete Role - Delete existing role',
            'اعطاء-رتبة': 'Give Role - Give role to member',
            'ازالة-رتبة': 'Remove Role - Remove role from member',
            'مسح': 'Clear - Delete number of messages',
            'اسم-مستعار': 'Nickname - Change member nickname',
            'ارسل': 'Send DM - Send private message to person',
            'ارسال': 'Mass DM - Send message to multiple people',
            'زخرفة': 'Decoration - Decorate text with different styles',
            'حذف_روم': 'Delete Room - Delete room from server',
            'معلومات_العضو': 'Member Info - Display member information',
            'منع': 'Ban - Ban member from server',
            'باند': 'Kick - Kick member from server',
            'language': 'Language - Change bot language',
            'current-language': 'Current Language - Show current language'
        },
        
        // Points system
        currentPoints: '💰 Your Current Points',
        hasPoints: 'You have **{points}** points',
        userPoints: '💰 {username}\'s Points',
        dailyReward: '🎁 Daily Reward!',
        weeklyReward: '🎁 Weekly Reward!',
        monthlyReward: '🎁 Monthly Reward!',
        alreadyClaimedDaily: '❌ You already claimed your daily reward! Come back tomorrow.',
        alreadyClaimedWeekly: '❌ You already claimed your weekly reward! Come back next week.',
        alreadyClaimedMonthly: '❌ You already claimed your monthly reward! Come back next month.',
        transferSuccess: '✅ Transfer Successful',
        transferFailed: '❌ You don\'t have enough points!',
        
        // Games system
        gameActive: '❌ There\'s already an active game in this channel!',
        noActiveGame: '❌ No active game in this channel!',
        gameEnded: '🛑 Game Ended',
        joinGame: 'Join Game',
        leaveGame: 'Leave Game',
        
        // Errors
        error: '❌ Error',
        unknownCommand: 'Unknown command!',
        commandError: 'An error occurred while executing the command. Please try again.',
        
        // Language system
        languageChanged: '✅ Language changed to English',
        currentLanguage: 'Current Language',
        arabic: 'Arabic',
        english: 'English'
    }
};

// أوامر تبديل اللغة
const languageCommands = [
    new SlashCommandBuilder()
        .setName('language')
        .setDescription('Change bot language / تغيير لغة البوت')
        .addStringOption(option =>
            option.setName('lang')
                .setDescription('Choose language / اختر اللغة')
                .setRequired(true)
                .addChoices(
                    { name: 'العربية - Arabic', value: 'ar' },
                    { name: 'English - الإنجليزية', value: 'en' }
                )),

    new SlashCommandBuilder()
        .setName('current-language')
        .setDescription('Show current language / عرض اللغة الحالية'),

    new SlashCommandBuilder()
        .setName('شرح-الاوامر')
        .setDescription('شرح معاني الأوامر / Explain commands meanings')
        .addStringOption(option =>
            option.setName('الامر')
                .setDescription('الأمر المراد شرحه (اختياري) / Command to explain (optional)')
                .setRequired(false))
];

// دالة الحصول على لغة السيرفر
function getServerLanguage(guildId) {
    return serverLanguages.get(guildId) || 'ar'; // العربية افتراضية
}

// دالة تحديد لغة السيرفر
function setServerLanguage(guildId, language) {
    serverLanguages.set(guildId, language);
}

// دالة الترجمة
function translate(guildId, key, replacements = {}) {
    const language = getServerLanguage(guildId);
    let text = translations[language][key] || translations['ar'][key] || key;
    
    // استبدال المتغيرات في النص
    for (const [placeholder, value] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`{${placeholder}}`, 'g'), value);
    }
    
    return text;
}

// دالة معالجة أوامر اللغة
async function handleLanguageCommand(interaction) {
    const { commandName, guildId } = interaction;

    try {
        switch (commandName) {
            case 'language':
                const newLanguage = interaction.options.getString('lang');
                setServerLanguage(guildId, newLanguage);

                const languageEmbed = {
                    color: newLanguage === 'ar' ? 0x00ff00 : 0x0099ff,
                    title: translate(guildId, 'languageChanged'),
                    description: newLanguage === 'ar' ? 
                        'تم تبديل لغة البوت إلى العربية بنجاح! 🇸🇦' : 
                        'Bot language successfully changed to English! 🇺🇸',
                    fields: [
                        { 
                            name: translate(guildId, 'currentLanguage'), 
                            value: translate(guildId, newLanguage === 'ar' ? 'arabic' : 'english'), 
                            inline: true 
                        }
                    ],
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [languageEmbed] });
                break;

            case 'current-language':
                const currentLang = getServerLanguage(guildId);
                const currentLangEmbed = {
                    color: 0x3498db,
                    title: translate(guildId, 'currentLanguage'),
                    description: currentLang === 'ar' ? 
                        'اللغة الحالية للبوت: **العربية** 🇸🇦' : 
                        'Current bot language: **English** 🇺🇸',
                    fields: [
                        { 
                            name: currentLang === 'ar' ? 'كيفية التغيير' : 'How to Change', 
                            value: currentLang === 'ar' ? 
                                'استخدم الأمر `/language` لتغيير اللغة' : 
                                'Use `/language` command to change language', 
                            inline: false 
                        }
                    ],
                    timestamp: new Date()
                };

                await interaction.reply({ embeds: [currentLangEmbed] });
                break;

            case 'شرح-الاوامر':
                const language = getServerLanguage(guildId);
                const commandToExplain = interaction.options.getString('الامر');
                const explanations = translations[language].commandExplanations;

                if (commandToExplain) {
                    // شرح أمر واحد
                    const explanation = explanations[commandToExplain];
                    if (explanation) {
                        const singleCommandEmbed = {
                            color: 0x9b59b6,
                            title: language === 'ar' ? `📖 شرح الأمر: /${commandToExplain}` : `📖 Command Explanation: /${commandToExplain}`,
                            description: `**${explanation}**`,
                            footer: { 
                                text: language === 'ar' ? 
                                    'استخدم الأمر بدون تحديد أمر معين لعرض جميع الأوامر' : 
                                    'Use command without specifying to show all commands' 
                            },
                            timestamp: new Date()
                        };
                        await interaction.reply({ embeds: [singleCommandEmbed] });
                    } else {
                        await interaction.reply({ 
                            content: language === 'ar' ? 
                                '❌ الأمر غير موجود أو لا يوجد شرح له!' : 
                                '❌ Command not found or no explanation available!', 
                            ephemeral: true 
                        });
                    }
                } else {
                    // عرض جميع الأوامر
                    const commandFields = [];
                    const commands = Object.keys(explanations);
                    
                    // تقسيم الأوامر لمجموعات
                    const gameCommands = commands.filter(cmd => cmd.includes('لعبة') || cmd === 'نرد');
                    const pointCommands = commands.filter(cmd => ['نقدة', 'تحويل', 'اعطاء', 'نقطة', 'يومية', 'اسبوعية', 'شهرية', 'حساب-ضريبة'].includes(cmd));
                    const adminCommands = commands.filter(cmd => ['انشاء', 'رتبة', 'حذف-رتبة', 'اعطاء-رتبة', 'ازالة-رتبة', 'مسح', 'اسم-مستعار', 'حذف_روم', 'منع', 'باند'].includes(cmd));
                    const utilityCommands = commands.filter(cmd => ['ارسل', 'ارسال', 'زخرفة', 'معلومات_العضو', 'language', 'current-language'].includes(cmd));

                    if (gameCommands.length > 0) {
                        commandFields.push({
                            name: language === 'ar' ? '🎮 أوامر الألعاب' : '🎮 Game Commands',
                            value: gameCommands.map(cmd => `• \`/${cmd}\` - ${explanations[cmd]}`).join('\n'),
                            inline: false
                        });
                    }

                    if (pointCommands.length > 0) {
                        commandFields.push({
                            name: language === 'ar' ? '💰 أوامر النقدة' : '💰 Point Commands',
                            value: pointCommands.map(cmd => `• \`/${cmd}\` - ${explanations[cmd]}`).join('\n'),
                            inline: false
                        });
                    }

                    if (adminCommands.length > 0) {
                        commandFields.push({
                            name: language === 'ar' ? '⚙️ أوامر الإدارة' : '⚙️ Admin Commands',
                            value: adminCommands.map(cmd => `• \`/${cmd}\` - ${explanations[cmd]}`).join('\n'),
                            inline: false
                        });
                    }

                    if (utilityCommands.length > 0) {
                        commandFields.push({
                            name: language === 'ar' ? '🔧 أوامر الأدوات' : '🔧 Utility Commands',
                            value: utilityCommands.map(cmd => `• \`/${cmd}\` - ${explanations[cmd]}`).join('\n'),
                            inline: false
                        });
                    }

                    const allCommandsEmbed = {
                        color: 0x9b59b6,
                        title: language === 'ar' ? '📚 شرح جميع الأوامر' : '📚 All Commands Explanation',
                        description: language === 'ar' ? 
                            'قائمة شاملة بجميع أوامر البوت ومعانيها:' : 
                            'Comprehensive list of all bot commands and their meanings:',
                        fields: commandFields,
                        footer: { 
                            text: language === 'ar' ? 
                                'لشرح أمر محدد، استخدم الأمر مع تحديد اسم الأمر' : 
                                'To explain a specific command, use the command with command name specified' 
                        },
                        timestamp: new Date()
                    };

                    await interaction.reply({ embeds: [allCommandsEmbed] });
                }
                break;

            default:
                return false;
        }
        return true;
    } catch (error) {
        console.error('خطأ في نظام اللغة:', error);
        throw error;
    }
}

// دالة الحصول على نصوص مترجمة للألعاب
function getGameTexts(guildId) {
    const language = getServerLanguage(guildId);
    
    if (language === 'en') {
        return {
            rouletteTitle: '🎯 Roulette Game',
            rouletteDescription: `@here\n\n🎮 **New roulette game started!**\n\n📋 **Rules:**\n• Minimum: 4 players\n• Each round a random player chooses someone to eliminate\n• Last remaining player wins\n\n⏰ **Join time: 40 seconds**`,
            diceTitle: '🎲 Group Dice Game',
            diceDescription: `@here\n\n🎮 **Group dice game started!**\n\n📋 **Rules:**\n• Minimum: 4 players\n• Players divided into two teams\n• 3 rounds of competition\n• Each player gets random dice\n\n⏰ **Join time: 30 seconds**`,
            joinGame: 'Join Game',
            leaveGame: 'Leave Game',
            playersCount: 'Players',
            timeLeft: 'Time Left',
            status: 'Status',
            waitingPlayers: 'Waiting for players',
            noPlayersYet: 'No players yet',
            gameCancelled: '❌ Game Cancelled',
            notEnoughPlayers: 'Not enough players joined ({current}/4)\nMinimum required: 4 players',
            gameStarted: '🎲 **Dice game started!**',
            round: 'Round',
            team1: '🔴 **Team 1:**',
            team2: '🔵 **Team 2:**',
            starting: '🏁 **Starting...**',
            clickToJoin: 'Click "Join Game" to participate!',
            seconds: 'seconds'
        };
    } else {
        return {
            rouletteTitle: '🎯 لعبة الروليت',
            rouletteDescription: `@here\n\n🎮 **تم بدء لعبة روليت جديدة!**\n\n📋 **القواعد:**\n• الحد الأدنى: 4 لاعبين\n• كل جولة يختار لاعب عشوائي شخص لطرده\n• آخر لاعب متبقي هو الفائز\n\n⏰ **وقت الانضمام: 40 ثانية**`,
            diceTitle: '🎲 لعبة النرد الجماعية',
            diceDescription: `@here\n\n🎮 **تم بدء لعبة نرد جماعية!**\n\n📋 **القواعد:**\n• الحد الأدنى: 4 لاعبين\n• يتم تقسيم اللاعبين لفريقين\n• 3 جولات للمنافسة\n• كل لاعب يحصل على نرد عشوائي\n\n⏰ **وقت الانضمام: 30 ثانية**`,
            joinGame: 'دخول اللعبة',
            leaveGame: 'خروج من اللعبة',
            playersCount: 'اللاعبون',
            timeLeft: 'الوقت المتبقي',
            status: 'الحالة',
            waitingPlayers: 'انتظار اللاعبين',
            noPlayersYet: 'لا يوجد لاعبون بعد',
            gameCancelled: '❌ تم إلغاء اللعبة',
            notEnoughPlayers: 'لم ينضم عدد كافي من اللاعبين ({current}/4)\nالحد الأدنى: 4 لاعبين',
            gameStarted: '🎲 **بدأت لعبة النرد!**',
            round: 'الجولة',
            team1: '🔴 **الفريق الأول:**',
            team2: '🔵 **الفريق الثاني:**',
            starting: '🏁 **جاري البدء...**',
            clickToJoin: 'اضغط على "دخول اللعبة" للمشاركة!',
            seconds: 'ثانية'
        };
    }
}

module.exports = {
    languageCommands,
    handleLanguageCommand,
    getServerLanguage,
    setServerLanguage,
    translate,
    getGameTexts
};
