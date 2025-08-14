
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// تخزين البيانات
let ticketData = {
    supportRole: null,
    panelChannel: null,
    panelTitle: '🎫 مركز الدعم الفني',
    panelDescription: '📞 مرحباً بك في مركز الدعم الفني\n\n🔸 اضغط على الزر أدناه لفتح تذكرة جديدة\n🔸 سيتم الرد عليك في أسرع وقت ممكن\n🔸 فريق الدعم متوفر 24/7',
    ticketCount: 0,
    activeTickets: new Map(), // ticketId -> { userId, handlerId, lastActivity }
    warnings: new Map(), // userId -> count
    warningLogs: new Map() // userId -> [warnings array]
};

// قائمة الكلمات المحظورة
const badWords = [
    'كلب', 'حمار', 'غبي', 'احمق', 'لعين', 'خنزير', 'قذر', 'وسخ', 'تافه', 'حقير',
    'dog', 'stupid', 'idiot', 'fool', 'damn', 'shit', 'fuck', 'bitch', 'ass', 'hell',
    'قحبة', 'ابن قحبة', 'ابن الحرام', 'ابن العرص', 'ابن المرا', 'كس', 'نيك', 'متناك', 
    'لعير', 'لعينة', 'عاهرة', 'كسيسة', 'ابن الزنا', 'ابن الشرموطة', 'خرا', 'متخنث', 
    'حيوان', 'كلاب', 'وحش', 'أحمق', 'لئيم', 'سخيف', 'خسيس', 'سافل', 'منحرف', 
    'مغتصب', 'شرموط', 'شاذ', 'ابن القذر', 'ابن الغبي', 'مدعوخ', 'عبيط', 'ملعون', 
    'منحوس', 'فاسد', 'وغد', 'نذل', 'شرير', 'وقح', 'متعجرف', 'مغرور', 'جبان', 
    'مخادع', 'كاذب', 'متوحش', 'وحشي', 'متخلف', 'بذيء', 'خائن', 'متسلط'
];

// الأوامر
const commands = [
    new SlashCommandBuilder()
        .setName('ارسل')
        .setDescription('📤 إرسال رسالة خاصة لشخص محدد')
        .addUserOption(option =>
            option.setName('الشخص')
                .setDescription('👤 الشخص المراد إرسال الرسالة له')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسالة')
                .setDescription('💬 الرسالة المراد إرسالها')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('📢 هل تريد منشن الشخص في الرسالة؟')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('ارسل_متعدد')
        .setDescription('📤 إرسال رسالة خاصة لعدة أشخاص معينين')
        .addStringOption(option =>
            option.setName('الاشخاص')
                .setDescription('👥 الأشخاص (منفصلين بمسافة، مثال: @user1 @user2)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسالة')
                .setDescription('💬 الرسالة المراد إرسالها')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('📢 هل تريد منشن الأشخاص في الرسالة؟')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('ارسل_عشوائي')
        .setDescription('🎲 إرسال رسالة خاصة لعدد معين من الأعضاء بشكل عشوائي')
        .addIntegerOption(option =>
            option.setName('العدد')
                .setDescription('🔢 عدد الأعضاء المراد إرسال الرسالة لهم')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('الرسالة')
                .setDescription('💬 الرسالة المراد إرسالها')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('📢 هل تريد منشن الأعضاء في الرسالة؟')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('تحديد_رتبة_التكتات')
        .setDescription('⚙️ تحديد الرتبة المسؤولة عن إدارة التذاكر')
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('👨‍💼 الرتبة المسؤولة عن التذاكر')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('انشاء_بانل_التكتات')
        .setDescription('🎫 إنشاء بانل التذاكر في القناة المحددة')
        .addChannelOption(option =>
            option.setName('القناة')
                .setDescription('📝 القناة التي سيتم إرسال البانل فيها')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('العنوان')
                .setDescription('📋 عنوان البانل (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('الوصف')
                .setDescription('📄 وصف البانل (اختياري)')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('عرض_التحذيرات')
        .setDescription('📊 عرض سجل التحذيرات للمستخدم')
        .addUserOption(option =>
            option.setName('المستخدم')
                .setDescription('👤 المستخدم المراد عرض تحذيراته (اختياري)')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('تشخيص')
        .setDescription('🔧 فحص حالة البوت والنظام')
];

client.once('ready', async () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم ${client.user.tag}`);
    console.log(`🌐 متصل مع ${client.guilds.cache.size} سيرفر`);
    console.log(`👥 يخدم ${client.users.cache.size} مستخدم`);
    
    // تسجيل الأوامر (استخدام التوكن من client بدلاً من process.env)
    try {
        console.log('🔄 جاري تحديث أوامر البوت...');
        
        const rest = new REST({ version: '10' }).setToken(client.token);
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('✅ تم تحديث أوامر البوت بنجاح!');
        console.log(`📝 تم تسجيل ${commands.length} أوامر`);
        
        // طباعة أسماء الأوامر للتأكد
        console.log('📋 الأوامر المسجلة:');
        commands.forEach(cmd => {
            console.log(`   • /${cmd.name} - ${cmd.description}`);
        });
        
        // بدء مراقبة التذاكر
        startTicketMonitoring();
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الأوامر:', error);
        console.log('🔄 محاولة إعادة تسجيل الأوامر بعد 10 ثوانِ...');
        
        setTimeout(async () => {
            try {
                const rest = new REST({ version: '10' }).setToken(client.token);
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commands },
                );
                console.log('✅ تم تسجيل الأوامر بنجاح في المحاولة الثانية!');
            } catch (retryError) {
                console.error('❌ فشل في إعادة تسجيل الأوامر:', retryError);
            }
        }, 10000);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        console.log(`🔄 تفاعل جديد: ${interaction.type} من ${interaction.user.tag}`);
        
        if (interaction.isCommand()) {
            console.log(`📝 أمر slash: /${interaction.commandName}`);
            await handleSlashCommands(interaction);
        } else if (interaction.isButton()) {
            console.log(`🔘 زر: ${interaction.customId}`);
            await handleButtonInteractions(interaction);
        } else {
            console.log(`❓ نوع تفاعل غير معروف: ${interaction.type}`);
        }
    } catch (error) {
        console.error('❌ خطأ في معالجة التفاعل:', error);
        console.error('📊 تفاصيل التفاعل:', {
            type: interaction.type,
            commandName: interaction.commandName || 'غير محدد',
            customId: interaction.customId || 'غير محدد',
            user: interaction.user.tag,
            guild: interaction.guild?.name || 'DM'
        });
        
        if (!interaction.replied && !interaction.deferred) {
            try {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ خطأ في النظام')
                    .setDescription('حدث خطأ أثناء تنفيذ الأمر. يرجى المحاولة مرة أخرى.')
                    .addFields(
                        { name: '🔧 نوع الخطأ', value: error.name || 'خطأ غير معروف', inline: true },
                        { name: '📝 الأمر', value: interaction.commandName || 'غير محدد', inline: true }
                    )
                    .setColor('#ff0000')
                    .setTimestamp();
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } catch (replyError) {
                console.error('❌ فشل في الرد على التفاعل:', replyError);
            }
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // فحص الكلمات المحظورة
    await checkBadWords(message);
    
    // مراقبة رسائل "مسك" و "دعم" في التذاكر
    if (message.channel.name && message.channel.name.startsWith('ticket-')) {
        await handleTicketMessages(message);
    }
});

async function checkBadWords(message) {
    const messageContent = message.content.toLowerCase();
    const containsBadWord = badWords.some(word => messageContent.includes(word));
    
    if (containsBadWord) {
        try {
            // حذف الرسالة
            await message.delete();
            
            // إعطاء timeout للعضو
            await message.member.timeout(10 * 60 * 1000, 'استخدام كلمات غير لائقة');
            
            // إرسال تحذير
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ تحذير - كلمات غير لائقة')
                .setDescription(`${message.author} تم إعطاؤك timeout لمدة 10 دقائق بسبب استخدام كلمات غير لائقة.`)
                .addFields(
                    { name: '📝 القاعدة', value: 'عدم استخدام الكلمات المسيئة أو غير اللائقة', inline: false },
                    { name: '⏰ مدة العقوبة', value: '10 دقائق', inline: true },
                    { name: '🔄 العقوبة التالية', value: 'timeout أطول', inline: true }
                )
                .setColor('#ff6b6b')
                .setTimestamp()
                .setFooter({ text: 'نظام مانع السب - البوت' });
            
            await message.channel.send({ embeds: [warningEmbed] });
            
            console.log(`⚠️ تم معاقبة ${message.author.tag} لاستخدام كلمات غير لائقة`);
        } catch (error) {
            console.error('❌ خطأ في معاقبة المستخدم للسب:', error);
        }
    }
}

async function handleSlashCommands(interaction) {
    const { commandName } = interaction;
    
    console.log(`📝 تم استلام الأمر: ${commandName} من ${interaction.user.tag}`);
    
    try {
        switch (commandName) {
            case 'ارسل':
                await handleSendPrivateMessage(interaction);
                break;
            case 'ارسل_متعدد':
                await handleSendMultiplePrivateMessages(interaction);
                break;
            case 'ارسل_عشوائي':
                await handleSendRandomPrivateMessages(interaction);
                break;
            case 'تحديد_رتبة_التكتات':
                await handleSetTicketRole(interaction);
                break;
            case 'انشاء_بانل_التكتات':
                await handleCreateTicketPanel(interaction);
                break;
            case 'عرض_التحذيرات':
                await handleShowWarnings(interaction);
                break;
            case 'تشخيص':
                await handleDiagnostics(interaction);
                break;
            default:
                const unknownEmbed = new EmbedBuilder()
                    .setTitle('❓ أمر غير معروف')
                    .setDescription('هذا الأمر غير موجود. يرجى التحقق من الأوامر المتاحة.')
                    .setColor('#ffa500')
                    .setTimestamp();
                await interaction.reply({ embeds: [unknownEmbed], ephemeral: true });
        }
    } catch (error) {
        console.error(`❌ خطأ في الأمر ${commandName}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ خطأ')
                .setDescription('حدث خطأ أثناء تنفيذ الأمر.')
                .setColor('#ff0000')
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

async function handleSendPrivateMessage(interaction) {
    const user = interaction.options.getUser('الشخص');
    const message = interaction.options.getString('الرسالة');
    const mention = interaction.options.getBoolean('منشن');
    
    try {
        const messageEmbed = new EmbedBuilder()
            .setTitle('📩 رسالة خاصة')
            .setDescription(message)
            .setColor('#4a90e2')
            .setTimestamp()
            .setFooter({ text: `من: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        if (mention) {
            await user.send({ content: `${user}`, embeds: [messageEmbed] });
        } else {
            await user.send({ embeds: [messageEmbed] });
        }
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ تم الإرسال بنجاح')
            .setDescription(`تم إرسال الرسالة بنجاح إلى ${user.tag}`)
            .addFields(
                { name: '👤 المستقبل', value: user.tag, inline: true },
                { name: '📢 منشن', value: mention ? 'نعم' : 'لا', inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
        console.error('❌ خطأ في إرسال الرسالة الخاصة:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ فشل في الإرسال')
            .setDescription('فشل في إرسال الرسالة. قد يكون لدى المستخدم رسائل خاصة مغلقة.')
            .addFields(
                { name: '👤 المستخدم', value: user.tag, inline: true },
                { name: '🔒 السبب المحتمل', value: 'الرسائل الخاصة مغلقة', inline: true }
            )
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleSendMultiplePrivateMessages(interaction) {
    const usersString = interaction.options.getString('الاشخاص');
    const message = interaction.options.getString('الرسالة');
    const mention = interaction.options.getBoolean('منشن');
    
    await interaction.deferReply({ ephemeral: true });
    
    // استخراج معرفات المستخدمين من المنشنز
    const userMatches = usersString.match(/<@!?(\d+)>/g);
    if (!userMatches) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ خطأ في التنسيق')
            .setDescription('لم يتم العثور على مستخدمين صالحين. يرجى استخدام المنشن مثل @user1 @user2')
            .setColor('#ff0000')
            .setTimestamp();
        await interaction.editReply({ embeds: [errorEmbed] });
        return;
    }
    
    // استخراج الأرقام فقط
    const userIds = userMatches.map(match => match.match(/\d+/)[0]);
    
    let successCount = 0;
    let failureCount = 0;
    
    const processingEmbed = new EmbedBuilder()
        .setTitle('⏳ جاري المعالجة')
        .setDescription('جاري إرسال الرسائل...')
        .addFields(
            { name: '📊 العدد المطلوب', value: userIds.length.toString(), inline: true },
            { name: '⚡ الحالة', value: 'قيد التنفيذ', inline: true }
        )
        .setColor('#ffa500')
        .setTimestamp();
    
    await interaction.editReply({ embeds: [processingEmbed] });
    
    const messageEmbed = new EmbedBuilder()
        .setTitle('📩 رسالة جماعية')
        .setDescription(message)
        .setColor('#4a90e2')
        .setTimestamp()
        .setFooter({ text: `من: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
    
    for (const userId of userIds) {
        try {
            const user = await client.users.fetch(userId);
            if (user) {
                if (mention) {
                    await user.send({ content: `${user}`, embeds: [messageEmbed] });
                } else {
                    await user.send({ embeds: [messageEmbed] });
                }
                successCount++;
                console.log(`✅ تم إرسال الرسالة بنجاح إلى ${user.tag}`);
            }
        } catch (error) {
            console.error(`❌ فشل في إرسال الرسالة للمستخدم ${userId}:`, error);
            failureCount++;
        }
        
        // تأخير صغير لتجنب Rate Limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const resultEmbed = new EmbedBuilder()
        .setTitle('📊 نتائج الإرسال الجماعي')
        .setDescription('تم الانتهاء من إرسال الرسائل')
        .addFields(
            { name: '✅ نجح', value: successCount.toString(), inline: true },
            { name: '❌ فشل', value: failureCount.toString(), inline: true },
            { name: '📊 المجموع', value: (successCount + failureCount).toString(), inline: true },
            { name: '📈 معدل النجاح', value: `${Math.round((successCount / (successCount + failureCount)) * 100)}%`, inline: false }
        )
        .setColor(successCount > failureCount ? '#00ff00' : '#ff6b6b')
        .setTimestamp();
    
    await interaction.editReply({ embeds: [resultEmbed] });
}

async function handleSendRandomPrivateMessages(interaction) {
    const count = interaction.options.getInteger('العدد');
    const message = interaction.options.getString('الرسالة');
    const mention = interaction.options.getBoolean('منشن');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // جلب جميع أعضاء السيرفر
        await interaction.guild.members.fetch();
        const members = interaction.guild.members.cache.filter(member => !member.user.bot);
        
        if (members.size === 0) {
            const noMembersEmbed = new EmbedBuilder()
                .setTitle('❌ لا توجد أعضاء')
                .setDescription('لا توجد أعضاء متاحين في السيرفر لإرسال الرسائل لهم.')
                .setColor('#ff0000')
                .setTimestamp();
            await interaction.editReply({ embeds: [noMembersEmbed] });
            return;
        }
        
        if (count > members.size) {
            const tooManyEmbed = new EmbedBuilder()
                .setTitle('⚠️ العدد كبير جداً')
                .setDescription(`العدد المطلوب (${count}) أكبر من عدد الأعضاء المتاحين (${members.size})`)
                .addFields(
                    { name: '👥 الأعضاء المتاحين', value: members.size.toString(), inline: true },
                    { name: '🔢 العدد المطلوب', value: count.toString(), inline: true }
                )
                .setColor('#ffa500')
                .setTimestamp();
            await interaction.editReply({ embeds: [tooManyEmbed] });
            return;
        }
        
        // اختيار أعضاء عشوائيين
        const selectedMembers = [];
        const memberArray = Array.from(members.values());
        
        for (let i = 0; i < count; i++) {
            let randomMember;
            do {
                randomMember = memberArray[Math.floor(Math.random() * memberArray.length)];
            } while (selectedMembers.includes(randomMember));
            
            selectedMembers.push(randomMember);
        }
        
        let successCount = 0;
        let failureCount = 0;
        
        const processingEmbed = new EmbedBuilder()
            .setTitle('🎲 إرسال عشوائي')
            .setDescription('جاري إرسال الرسائل للأعضاء المختارين عشوائياً...')
            .addFields(
                { name: '🎯 العدد المحدد', value: count.toString(), inline: true },
                { name: '👥 إجمالي الأعضاء', value: members.size.toString(), inline: true },
                { name: '⚡ الحالة', value: 'قيد التنفيذ', inline: true }
            )
            .setColor('#9b59b6')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [processingEmbed] });
        
        const messageEmbed = new EmbedBuilder()
            .setTitle('🎲 رسالة عشوائية')
            .setDescription(message)
            .setColor('#9b59b6')
            .setTimestamp()
            .setFooter({ text: `من: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        for (const member of selectedMembers) {
            try {
                if (mention) {
                    await member.user.send({ content: `${member.user}`, embeds: [messageEmbed] });
                } else {
                    await member.user.send({ embeds: [messageEmbed] });
                }
                successCount++;
                console.log(`✅ تم إرسال الرسالة العشوائية بنجاح إلى ${member.user.tag}`);
            } catch (error) {
                console.error(`❌ فشل في إرسال الرسالة العشوائية للعضو ${member.user.tag}:`, error);
                failureCount++;
            }
            
            // تأخير صغير لتجنب Rate Limiting
            await new Promise(resolve => setTimeout(resolve, 600));
        }
        
        const resultEmbed = new EmbedBuilder()
            .setTitle('🎲 نتائج الإرسال العشوائي')
            .setDescription('تم الانتهاء من إرسال الرسائل للأعضاء المختارين عشوائياً')
            .addFields(
                { name: '🎯 العدد المطلوب', value: count.toString(), inline: true },
                { name: '✅ نجح الإرسال', value: successCount.toString(), inline: true },
                { name: '❌ فشل الإرسال', value: failureCount.toString(), inline: true },
                { name: '📈 معدل النجاح', value: `${Math.round((successCount / count) * 100)}%`, inline: true },
                { name: '👥 من إجمالي', value: `${members.size} عضو`, inline: true },
                { name: '🎲 طريقة الاختيار', value: 'عشوائي تماماً', inline: true }
            )
            .setColor(successCount > failureCount ? '#00ff00' : '#ff6b6b')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [resultEmbed] });
        
    } catch (error) {
        console.error('❌ خطأ في الإرسال العشوائي:', error);
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ خطأ في الإرسال')
            .setDescription('حدث خطأ أثناء إرسال الرسائل العشوائية.')
            .setColor('#ff0000')
            .setTimestamp();
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleSetTicketRole(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const noPermEmbed = new EmbedBuilder()
            .setTitle('🚫 ليس لديك صلاحية')
            .setDescription('تحتاج صلاحية المدير لاستخدام هذا الأمر.')
            .setColor('#ff0000')
            .setTimestamp();
        await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        return;
    }
    
    const role = interaction.options.getRole('الرتبة');
    ticketData.supportRole = role.id;
    
    const successEmbed = new EmbedBuilder()
        .setTitle('✅ تم تحديد رتبة الدعم')
        .setDescription(`تم تحديد رتبة الدعم بنجاح`)
        .addFields(
            { name: '👨‍💼 الرتبة المحددة', value: role.name, inline: true },
            { name: '👥 عدد الأعضاء', value: role.members.size.toString(), inline: true },
            { name: '🎨 لون الرتبة', value: role.hexColor, inline: true }
        )
        .setColor('#00ff00')
        .setTimestamp();
    
    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
}

async function handleCreateTicketPanel(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const noPermEmbed = new EmbedBuilder()
            .setTitle('🚫 ليس لديك صلاحية')
            .setDescription('تحتاج صلاحية المدير لاستخدام هذا الأمر.')
            .setColor('#ff0000')
            .setTimestamp();
        await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        return;
    }
    
    const channel = interaction.options.getChannel('القناة');
    const title = interaction.options.getString('العنوان') || ticketData.panelTitle;
    const description = interaction.options.getString('الوصف') || ticketData.panelDescription;
    
    ticketData.panelChannel = channel.id;
    ticketData.panelTitle = title;
    ticketData.panelDescription = description;
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields(
            { name: '⏰ ساعات العمل', value: '24/7 متوفرون لخدمتكم', inline: true },
            { name: '⚡ وقت الاستجابة', value: 'خلال 5 دقائق', inline: true },
            { name: '🏆 جودة الخدمة', value: 'دعم فني متخصص', inline: true }
        )
        .setColor('#4a90e2')
        .setTimestamp()
        .setFooter({ text: 'نظام التذاكر المتقدم', iconURL: interaction.guild.iconURL() });
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('🎫 إنشاء تذكرة جديدة')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );
    
    try {
        await channel.send({ embeds: [embed], components: [row] });
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ تم إنشاء البانل بنجاح')
            .setDescription('تم إنشاء بانل التذاكر بنجاح!')
            .addFields(
                { name: '📍 القناة', value: channel.toString(), inline: true },
                { name: '📋 العنوان', value: title, inline: true },
                { name: '🎯 الحالة', value: 'جاهز للاستخدام', inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
        console.error('❌ خطأ في إنشاء بانل التذاكر:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ فشل في إنشاء البانل')
            .setDescription('فشل في إنشاء بانل التذاكر. تأكد من أن البوت له صلاحيات الكتابة في القناة.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleDiagnostics(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🔧 تشخيص البوت')
        .setDescription('معلومات مفصلة عن حالة البوت')
        .addFields(
            { name: '🤖 اسم البوت', value: client.user.tag, inline: true },
            { name: '🆔 معرف البوت', value: client.user.id, inline: true },
            { name: '🌐 السيرفرات', value: client.guilds.cache.size.toString(), inline: true },
            { name: '👥 المستخدمين', value: client.users.cache.size.toString(), inline: true },
            { name: '📺 القنوات', value: client.channels.cache.size.toString(), inline: true },
            { name: '📊 الـ ping', value: `${client.ws.ping}ms`, inline: true },
            { name: '⏰ وقت التشغيل', value: `${Math.floor(client.uptime / 1000 / 60)} دقيقة`, inline: true },
            { name: '💾 استخدام الذاكرة', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
            { name: '📝 الأوامر المُسجلة', value: commands.length.toString(), inline: true },
            { name: '🎫 التذاكر النشطة', value: ticketData.activeTickets.size.toString(), inline: true },
            { name: '⚠️ مجموع التحذيرات', value: Array.from(ticketData.warnings.values()).reduce((a, b) => a + b, 0).toString(), inline: true },
            { name: '🔧 إصدار Discord.js', value: '14.21.0', inline: true }
        )
        .setColor('#4a90e2')
        .setTimestamp()
        .setFooter({ text: 'نظام التشخيص المتقدم' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleShowWarnings(interaction) {
    const user = interaction.options.getUser('المستخدم') || interaction.user;
    const warnings = ticketData.warningLogs.get(user.id) || [];
    
    if (warnings.length === 0) {
        const noWarningsEmbed = new EmbedBuilder()
            .setTitle('✅ سجل نظيف')
            .setDescription(`لا توجد تحذيرات لـ ${user.tag}`)
            .addFields(
                { name: '👤 المستخدم', value: user.tag, inline: true },
                { name: '📊 عدد التحذيرات', value: '0', inline: true },
                { name: '🏆 الحالة', value: 'عضو مثالي', inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [noWarningsEmbed], ephemeral: true });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`📊 سجل التحذيرات - ${user.tag}`)
        .setDescription(`إجمالي التحذيرات: **${warnings.length}**`)
        .addFields(
            warnings.slice(0, 10).map((warning, index) => ({
                name: `⚠️ تحذير #${index + 1}`,
                value: `**السبب:** ${warning.reason}\n**التاريخ:** ${new Date(warning.date).toLocaleString('ar-SA')}`,
                inline: false
            }))
        )
        .setColor('#ff6b6b')
        .setTimestamp()
        .setFooter({ text: warnings.length > 10 ? `عرض 10 من أصل ${warnings.length} تحذيرات` : 'جميع التحذيرات' });
    
    if (warnings.length > 10) {
        embed.addFields({
            name: '📋 ملاحظة',
            value: `يتم عرض آخر 10 تحذيرات فقط. إجمالي التحذيرات: ${warnings.length}`,
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleButtonInteractions(interaction) {
    if (interaction.customId === 'create_ticket') {
        await createTicket(interaction);
    } else if (interaction.customId === 'close_ticket') {
        await closeTicket(interaction);
    } else if (interaction.customId === 'call_support') {
        await callSupport(interaction);
    }
}

async function createTicket(interaction) {
    if (!ticketData.supportRole) {
        const noRoleEmbed = new EmbedBuilder()
            .setTitle('⚙️ إعداد غير مكتمل')
            .setDescription('لم يتم تحديد رتبة الدعم بعد! يرجى التواصل مع الإدارة.')
            .setColor('#ffa500')
            .setTimestamp();
        await interaction.reply({ embeds: [noRoleEmbed], ephemeral: true });
        return;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        ticketData.ticketCount++;
        const ticketId = `ticket-${ticketData.ticketCount}`;
        
        const guild = interaction.guild;
        const supportRole = guild.roles.cache.get(ticketData.supportRole);
        
        const channel = await guild.channels.create({
            name: ticketId,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: supportRole.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        
        ticketData.activeTickets.set(ticketId, {
            userId: interaction.user.id,
            handlerId: null,
            lastActivity: Date.now(),
            channelId: channel.id
        });
        
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🎫 مرحباً بك في تذكرة الدعم!')
            .setDescription(`مرحباً ${interaction.user}! 👋\n\nشكراً لك على التواصل معنا. سيقوم أحد أعضاء فريق الدعم بمساعدتك قريباً.`)
            .addFields(
                { name: '📝 معلومات التذكرة', value: `**رقم التذكرة:** ${ticketId}\n**تاريخ الإنشاء:** ${new Date().toLocaleString('ar-SA')}`, inline: false },
                { name: '⏰ وقت الاستجابة المتوقع', value: '5-10 دقائق', inline: true },
                { name: '👨‍💼 فريق الدعم', value: supportRole.name, inline: true },
                { name: '📋 إرشادات', value: '• اشرح مشكلتك بالتفصيل\n• كن صبوراً معنا\n• تجنب الرسائل المتكررة', inline: false }
            )
            .setColor('#4a90e2')
            .setTimestamp()
            .setFooter({ text: 'نظام التذاكر المتقدم', iconURL: guild.iconURL() });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🗑️ إغلاق التذكرة')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('call_support')
                    .setLabel('📞 استدعاء مشرف')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📞')
            );
        
        await channel.send({ embeds: [welcomeEmbed], components: [row] });
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ تم إنشاء التذكرة بنجاح')
            .setDescription(`تم إنشاء تذكرتك بنجاح!`)
            .addFields(
                { name: '🎫 رقم التذكرة', value: ticketId, inline: true },
                { name: '📍 القناة', value: channel.toString(), inline: true },
                { name: '⚡ الحالة', value: 'جاهزة للاستخدام', inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
        console.error('❌ خطأ في إنشاء التذكرة:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ فشل في إنشاء التذكرة')
            .setDescription('فشل في إنشاء التذكرة. تأكد من أن البوت له صلاحيات إنشاء القنوات.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function closeTicket(interaction) {
    const channel = interaction.channel;
    if (!channel.name.startsWith('ticket-')) {
        const invalidEmbed = new EmbedBuilder()
            .setTitle('❌ قناة غير صالحة')
            .setDescription('هذا الأمر يعمل فقط في التذاكر!')
            .setColor('#ff0000')
            .setTimestamp();
        await interaction.reply({ embeds: [invalidEmbed], ephemeral: true });
        return;
    }
    
    ticketData.activeTickets.delete(channel.name);
    
    const closingEmbed = new EmbedBuilder()
        .setTitle('🗑️ إغلاق التذكرة')
        .setDescription('سيتم إغلاق التذكرة خلال 5 ثوانِ...')
        .addFields(
            { name: '👤 مغلقة بواسطة', value: interaction.user.tag, inline: true },
            { name: '⏰ وقت الإغلاق', value: new Date().toLocaleString('ar-SA'), inline: true }
        )
        .setColor('#ff6b6b')
        .setTimestamp();
    
    await interaction.reply({ embeds: [closingEmbed], ephemeral: false });
    
    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (error) {
            console.error('❌ خطأ في حذف القناة:', error);
        }
    }, 5000);
}

async function callSupport(interaction) {
    const channel = interaction.channel;
    const ticketInfo = ticketData.activeTickets.get(channel.name);
    
    if (!ticketInfo) {
        const noInfoEmbed = new EmbedBuilder()
            .setTitle('❌ معلومات غير موجودة')
            .setDescription('معلومات التذكرة غير موجودة!')
            .setColor('#ff0000')
            .setTimestamp();
        await interaction.reply({ embeds: [noInfoEmbed], ephemeral: true });
        return;
    }
    
    // التحقق من مرور 5 دقائق
    const timeDiff = Date.now() - ticketInfo.lastActivity;
    if (timeDiff < 5 * 60 * 1000) {
        const remainingTime = Math.ceil((5 * 60 * 1000 - timeDiff) / 1000);
        const waitEmbed = new EmbedBuilder()
            .setTitle('⏰ يرجى الانتظار')
            .setDescription(`يجب انتظار ${remainingTime} ثانية قبل استدعاء المشرف.`)
            .addFields(
                { name: '⏱️ الوقت المتبقي', value: `${Math.floor(remainingTime / 60)} دقيقة و ${remainingTime % 60} ثانية`, inline: true }
            )
            .setColor('#ffa500')
            .setTimestamp();
        await interaction.reply({ embeds: [waitEmbed], ephemeral: true });
        return;
    }
    
    const supportRole = interaction.guild.roles.cache.get(ticketData.supportRole);
    if (!supportRole) {
        const noRoleEmbed = new EmbedBuilder()
            .setTitle('❌ رتبة غير موجودة')
            .setDescription('رتبة الدعم غير موجودة!')
            .setColor('#ff0000')
            .setTimestamp();
        await interaction.reply({ embeds: [noRoleEmbed], ephemeral: true });
        return;
    }
    
    await interaction.reply({ content: `${supportRole} تم استدعاؤكم للمساعدة في هذه التذكرة.`, ephemeral: false });
    ticketInfo.lastActivity = Date.now();
}

async function handleTicketMessages(message) {
    const channel = message.channel;
    const ticketInfo = ticketData.activeTickets.get(channel.name);
    
    if (!ticketInfo) return;
    
    const supportRole = message.guild.roles.cache.get(ticketData.supportRole);
    if (!supportRole) return;
    
    const hasSupportRole = message.member.roles.cache.has(supportRole.id);
    
    if (message.content.toLowerCase() === 'مسك' && hasSupportRole) {
        // تجاهل إذا كان الشخص هو من فتح التذكرة
        if (message.author.id === ticketInfo.userId) return;
        
        // تجاهل إذا كانت التذكرة ممسوكة بالفعل
        if (ticketInfo.handlerId) return;
        
        ticketInfo.handlerId = message.author.id;
        ticketInfo.lastActivity = Date.now();
        
        const claimEmbed = new EmbedBuilder()
            .setTitle('✅ تم مسك التذكرة')
            .setDescription(`تم مسك التذكرة من قبل ${message.author}`)
            .addFields(
                { name: '👨‍💼 المسؤول', value: message.author.tag, inline: true },
                { name: '⏰ وقت المسك', value: new Date().toLocaleString('ar-SA'), inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
        
        await message.reply({ embeds: [claimEmbed] });
        
        // بدء مراقبة هذا المستخدم
        startUserMonitoring(message.author.id);
        
    } else if (message.content.toLowerCase() === 'دعم' && message.author.id === ticketInfo.handlerId) {
        await message.channel.send(`${supportRole} تم طلب الدعم الإضافي.`);
        ticketInfo.handlerId = null; // إعادة تعيين المسؤول
        ticketInfo.lastActivity = Date.now();
    }
    
    // تحديث آخر نشاط إذا كان الرسالة من المسؤول عن التذكرة
    if (message.author.id === ticketInfo.handlerId) {
        ticketInfo.lastActivity = Date.now();
    }
}

function startTicketMonitoring() {
    setInterval(() => {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        for (const [ticketId, ticketInfo] of ticketData.activeTickets) {
            if (ticketInfo.handlerId && (now - ticketInfo.lastActivity) >= oneHour) {
                // إصدار تحذير
                issueWarning(ticketInfo.handlerId, 'عدم الرد على التذكرة لمدة ساعة');
                
                // إعادة تعيين آخر نشاط لتجنب التحذيرات المتكررة
                ticketInfo.lastActivity = now;
            }
        }
    }, 5 * 60 * 1000); // فحص كل 5 دقائق
}

function startUserMonitoring(userId) {
    // هذه الوظيفة تبدأ مراقبة مستخدم معين
    console.log(`🔍 بدء مراقبة المستخدم: ${userId}`);
}

function issueWarning(userId, reason) {
    const currentWarnings = ticketData.warnings.get(userId) || 0;
    const newWarningCount = currentWarnings + 1;
    
    ticketData.warnings.set(userId, newWarningCount);
    
    // تسجيل التحذير
    if (!ticketData.warningLogs.has(userId)) {
        ticketData.warningLogs.set(userId, []);
    }
    
    ticketData.warningLogs.get(userId).push({
        reason: reason,
        date: Date.now()
    });
    
    console.log(`⚠️ تحذير #${newWarningCount} للمستخدم ${userId}: ${reason}`);
    
    // إذا وصل لـ 3 تحذيرات، إعطاء timeout
    if (newWarningCount >= 3) {
        timeoutUser(userId);
        ticketData.warnings.set(userId, 0); // إعادة تعيين العداد
    }
}

async function timeoutUser(userId) {
    try {
        const guilds = client.guilds.cache;
        
        for (const guild of guilds.values()) {
            try {
                const member = await guild.members.fetch(userId);
                if (member) {
                    await member.timeout(30 * 60 * 1000, 'تجميع 3 تحذيرات من نظام التذاكر');
                    console.log(`⏰ تم إعطاء timeout للمستخدم ${userId} لمدة 30 دقيقة.`);
                    break;
                }
            } catch (error) {
                // المستخدم ليس في هذا السيرفر
                continue;
            }
        }
    } catch (error) {
        console.error('❌ خطأ في إعطاء timeout للمستخدم:', error);
    }
}

// معالجة الأخطاء
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// تسجيل الدخول
const token = process.env.BOT_TOKEN;
if (!token) {
    console.log('⚠️ تحذير: BOT_TOKEN غير محدد في متغيرات البيئة');
    console.log('💡 يرجى إضافة التوكن في الـ Secrets tab لتشغيل البوت');
    console.log('🔄 البوت سيحاول الاتصال كل 30 ثانية...');
    
    // محاولة الاتصال كل 30 ثانية
    setInterval(() => {
        const retryToken = process.env.BOT_TOKEN;
        if (retryToken) {
            console.log('✅ تم العثور على التوكن، جاري الاتصال...');
            client.login(retryToken).catch(error => {
                console.error('❌ فشل في تسجيل الدخول:', error);
            });
        } else {
            console.log('⏳ لا يزال التوكن غير موجود، محاولة أخرى خلال 30 ثانية...');
        }
    }, 30000);
} else {
    client.login(token).catch(error => {
        console.error('❌ فشل في تسجيل الدخول:', error);
        console.log('🔄 إعادة المحاولة خلال 10 ثواني...');
        setTimeout(() => {
            client.login(token).catch(err => {
                console.error('❌ فشل في إعادة المحاولة:', err);
            });
        }, 10000);
    });
}
